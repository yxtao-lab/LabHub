import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { spawn } from 'node:child_process';
import { hasProjectAnalysis } from './analysis.js';
import { generateProjectAnalysis } from './analysis-generate.js';
import {
  cloneRepository,
  deriveProjectId,
  isGitRepo,
  pullOrigin,
  readGitSummary,
  sanitizeId,
} from './git.js';
import { extractRuntimeUrls } from './log-urls.js';
import { openBrowserWhenReady } from './open-browser.js';
import { processManager } from './process-manager.js';
import {
  DEFAULT_PROFILE_ID,
  findStartProfile,
  normalizeProjectRecord,
  resolveDefaultProfileId,
  resolvePhases,
  resolveStartProfiles,
  runtimeKey,
} from './profiles.js';
import {
  findProject,
  loadProjects,
  PROJECTS_DIR,
  removeProject,
  resolveProjectPath,
  upsertProject,
} from './store.js';
import { normalizeTags } from './tags.js';
import type {
  LogLine,
  ProfileRuntimeView,
  ProjectRecord,
  ProjectView,
  RuntimeState,
  StartProfile,
} from './types.js';

const tagsSchema = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => normalizeTags(value));

const startProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  command: z.string().min(1),
  openUrl: z.string().url().nullable().optional(),
  cwd: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  description: z.string().optional(),
});

const phaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['done', 'current', 'planned']),
  summary: z.string().default(''),
});

export const addProjectSchema = z.object({
  repoUrl: z.string().min(1),
  id: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  branch: z.string().min(1).default('main'),
  startCommand: z.string().min(1).default('npm run dev'),
  installCommand: z.string().default('npm install'),
  openUrl: z.string().url().nullable().optional(),
  upstreamUrl: z.string().nullable().optional(),
  tags: tagsSchema,
  notes: z.string().optional(),
  localPath: z.string().optional(),
  shallow: z.boolean().default(true),
  skipInstall: z.boolean().default(false),
  startProfiles: z.array(startProfileSchema).optional(),
  defaultProfileId: z.string().nullable().optional(),
  phases: z.array(phaseSchema).optional(),
  currentPhase: z.string().nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  startCommand: z.string().min(1).optional(),
  installCommand: z.string().optional(),
  openUrl: z.string().url().nullable().optional(),
  upstreamUrl: z.string().nullable().optional(),
  tags: tagsSchema,
  notes: z.string().optional(),
  branch: z.string().min(1).optional(),
  startProfiles: z.array(startProfileSchema).optional(),
  defaultProfileId: z.string().nullable().optional(),
  phases: z.array(phaseSchema).optional(),
  currentPhase: z.string().nullable().optional(),
});

/**
 * 聚合多模式运行态：任一 running/starting → running/starting；否则取 error 或 stopped。
 *
 * @param views - 各模式运行视图
 * @returns 聚合态
 */
function aggregateRuntime(views: ProfileRuntimeView[]): RuntimeState {
  if (views.some((item) => item.runtime.status === 'starting')) {
    return { status: 'starting', pid: null, startedAt: null, exitedAt: null, exitCode: null, error: null };
  }
  if (views.some((item) => item.runtime.status === 'stopping')) {
    return { status: 'stopping', pid: null, startedAt: null, exitedAt: null, exitCode: null, error: null };
  }
  const running = views.filter((item) => item.runtime.status === 'running');
  if (running.length > 0) {
    return {
      status: 'running',
      pid: running[0]?.runtime.pid ?? null,
      startedAt: running[0]?.runtime.startedAt ?? null,
      exitedAt: null,
      exitCode: null,
      error: null,
      profileId: running[0]?.profile.id ?? null,
    };
  }
  const errored = views.find((item) => item.runtime.status === 'error');
  if (errored) {
    return { ...errored.runtime, profileId: errored.profile.id };
  }
  return {
    status: 'stopped',
    pid: null,
    startedAt: null,
    exitedAt: null,
    exitCode: null,
    error: null,
  };
}

/**
 * 解析模式工作目录（项目根 + 相对 cwd）。
 *
 * @param projectRoot - 项目绝对路径
 * @param profile - 启动模式
 * @returns 绝对 cwd
 * @throws {Error} 目录不存在或越界时抛出
 */
function resolveProfileCwd(projectRoot: string, profile: StartProfile): string {
  const root = path.resolve(projectRoot);
  if (!profile.cwd) {
    return root;
  }
  const target = path.resolve(root, profile.cwd);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new Error(`启动模式 cwd 越界：${profile.cwd}`);
  }
  if (!fs.existsSync(target)) {
    throw new Error(`启动模式工作目录不存在：${target}`);
  }
  return target;
}

/**
 * 组装控制台所需的项目视图（含 git + 多模式运行态）。
 *
 * @param record - 持久化记录
 * @returns 视图对象
 */
export async function toProjectView(record: ProjectRecord): Promise<ProjectView> {
  const normalized = normalizeProjectRecord(record);
  const absolutePath = resolveProjectPath(normalized.path);
  const exists = fs.existsSync(absolutePath);
  const gitRepo = exists && isGitRepo(absolutePath);
  const git = gitRepo ? await readGitSummary(absolutePath) : null;
  const startProfiles = resolveStartProfiles(normalized);
  const defaultProfileId = resolveDefaultProfileId(normalized, startProfiles);

  const profileRuntimes: ProfileRuntimeView[] = [];
  const allUrls: string[] = [];
  const allLogs: LogLine[] = [];

  for (const profile of startProfiles) {
    const key = runtimeKey(normalized.id, profile.id);
    const recentLogs = processManager.getLogs(key, 80);
    const runtimeUrls = extractRuntimeUrls(recentLogs);
    const probeUrls = [profile.openUrl, ...runtimeUrls].filter(
      (item): item is string => Boolean(item),
    );
    const runtime = await processManager.getRuntime(key, probeUrls);
    profileRuntimes.push({
      profile,
      runtime: { ...runtime, profileId: profile.id },
      runtimeUrls,
    });
    allUrls.push(...probeUrls.filter(Boolean));
    allLogs.push(...recentLogs);
  }

  allLogs.sort((a, b) => a.ts.localeCompare(b.ts));
  const uniqueUrls = [...new Set(allUrls.filter(Boolean))];

  return {
    ...normalized,
    openUrl: normalized.openUrl ?? null,
    tags: normalizeTags(normalized.tags),
    absolutePath,
    exists,
    isGitRepo: Boolean(gitRepo),
    git,
    runtime: aggregateRuntime(profileRuntimes),
    profileRuntimes,
    recentLogs: allLogs.slice(-30),
    runtimeUrls: uniqueUrls,
    hasAnalysis: hasProjectAnalysis(normalized.path),
    startProfiles,
    defaultProfileId,
    phases: resolvePhases(normalized),
    currentPhase: normalized.currentPhase ?? null,
  };
}

/**
 * 列出全部项目视图。
 *
 * @returns 项目视图数组
 */
export async function listProjectViews(): Promise<ProjectView[]> {
  const projects = loadProjects();
  return Promise.all(projects.map((item) => toProjectView(item)));
}

/**
 * 通过 GitHub/Gitee 地址克隆并登记；或挂载已有本地路径。
 *
 * @param input - 校验后的入参
 * @returns 新建项目视图
 * @throws {Error} id 冲突或克隆失败时抛出
 */
export async function addProject(
  input: z.infer<typeof addProjectSchema>,
): Promise<ProjectView> {
  const id = sanitizeId(input.id ?? deriveProjectId(input.repoUrl));
  if (findProject(id)) {
    throw new Error(`项目 id 已存在：${id}`);
  }

  const now = new Date().toISOString();
  let relativePath: string;
  let absolutePath: string;

  if (input.localPath) {
    absolutePath = path.isAbsolute(input.localPath)
      ? input.localPath
      : path.resolve(PROJECTS_DIR, '..', input.localPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`本地路径不存在：${absolutePath}`);
    }
    relativePath = absolutePath;
  } else {
    relativePath = path.join('projects', id);
    absolutePath = path.join(PROJECTS_DIR, id);
    await cloneRepository({
      repoUrl: input.repoUrl,
      targetDir: absolutePath,
      branch: input.branch,
      shallow: input.shallow,
      upstreamUrl: input.upstreamUrl ?? null,
    });
  }

  if (!input.skipInstall && input.installCommand) {
    const pkg = path.join(absolutePath, 'package.json');
    if (fs.existsSync(pkg)) {
      await runShell(input.installCommand, absolutePath);
    }
  }

  const record = normalizeProjectRecord({
    id,
    name: input.name ?? id,
    repoUrl: input.repoUrl,
    branch: input.branch,
    path: relativePath,
    startCommand: input.startCommand,
    installCommand: input.installCommand,
    openUrl: input.openUrl ?? null,
    upstreamUrl: input.upstreamUrl ?? null,
    tags: normalizeTags(input.tags),
    createdAt: now,
    updatedAt: now,
    notes: input.notes ?? '',
    startProfiles: input.startProfiles,
    defaultProfileId: input.defaultProfileId ?? null,
    phases: input.phases,
    currentPhase: input.currentPhase ?? null,
  });
  upsertProject(record);
  try {
    generateProjectAnalysis(record, { force: false });
  } catch {
    // 分析生成失败不阻断登记
  }
  return toProjectView(record);
}

/**
 * 更新项目元数据（不改磁盘 path）。
 *
 * @param id - 项目 id
 * @param patch - 可更新字段
 * @returns 更新后视图
 * @throws {Error} 不存在时抛出
 */
export async function updateProject(
  id: string,
  patch: z.infer<typeof updateProjectSchema>,
): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const next = normalizeProjectRecord({
    ...current,
    ...patch,
    tags: patch.tags !== undefined ? normalizeTags(patch.tags) : normalizeTags(current.tags),
    updatedAt: new Date().toISOString(),
  });
  upsertProject(next);
  return toProjectView(next);
}

/**
 * 从清单移除项目；可选删除 projects 下目录。
 *
 * @param id - 项目 id
 * @param deleteFiles - 是否删除落地目录
 * @returns {void}
 * @throws {Error} 运行中或不存在时抛出
 */
export async function deleteProject(id: string, deleteFiles = false): Promise<void> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const view = await toProjectView(current);
  if (view.runtime.status === 'running' || view.runtime.status === 'starting') {
    throw new Error('请先停止全部启动模式再删除');
  }
  removeProject(id);
  if (deleteFiles) {
    const absolutePath = resolveProjectPath(current.path);
    const normalized = path.normalize(absolutePath);
    const projectsRoot = path.normalize(PROJECTS_DIR + path.sep);
    if (normalized.startsWith(projectsRoot) && fs.existsSync(normalized)) {
      fs.rmSync(normalized, { recursive: true, force: true });
    }
  }
}

/**
 * 启动指定模式；未传 profileId 时用默认模式。
 *
 * @param id - 项目 id
 * @param profileId - 启动模式 id
 * @returns 运行态视图
 * @throws {Error} 目录缺失等
 */
export async function startProject(
  id: string,
  profileId?: string | null,
): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const absolutePath = resolveProjectPath(current.path);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`项目目录不存在，请先重新拉取：${absolutePath}`);
  }
  const profiles = resolveStartProfiles(current);
  const profile = findStartProfile(
    profiles,
    profileId || resolveDefaultProfileId(current, profiles),
  );
  const cwd = resolveProfileCwd(absolutePath, profile);
  const probeUrls = [profile.openUrl].filter((item): item is string => Boolean(item));
  const key = runtimeKey(id, profile.id);
  await processManager.start(key, cwd, profile.command, probeUrls);
  if (profile.openUrl) {
    void openBrowserWhenReady(profile.openUrl).catch(() => {
      // 打开失败不阻断启动
    });
  }
  return toProjectView(current);
}

/**
 * 停止指定模式；未传 profileId 时停止全部模式。
 *
 * @param id - 项目 id
 * @param profileId - 启动模式 id；空则全部停止
 * @returns 视图
 */
export async function stopProject(
  id: string,
  profileId?: string | null,
): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const profiles = resolveStartProfiles(current);
  const targets = profileId
    ? [findStartProfile(profiles, profileId)]
    : profiles;

  let stoppedAny = false;
  for (const profile of targets) {
    const key = runtimeKey(id, profile.id);
    const probeUrls = [profile.openUrl].filter((item): item is string => Boolean(item));
    const runtime = await processManager.getRuntime(key, probeUrls);
    if (runtime.status === 'stopped') {
      continue;
    }
    await processManager.stop(key, probeUrls);
    stoppedAny = true;
  }
  if (!stoppedAny && profileId) {
    throw new Error(`启动模式未在运行：${profileId}`);
  }
  if (!stoppedAny) {
    throw new Error(`项目未在运行：${id}`);
  }
  return toProjectView(current);
}

/**
 * 执行安装命令（如 pnpm install）。
 *
 * @param id - 项目 id
 * @returns 视图
 * @throws {Error} 安装失败时抛出
 */
export async function installProject(id: string): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const absolutePath = resolveProjectPath(current.path);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`项目目录不存在：${absolutePath}`);
  }
  const command = current.installCommand || 'npm install';
  const key = runtimeKey(id, '__install__');
  await processManager.start(key, absolutePath, command, []);
  return toProjectView(current);
}

/**
 * 读取某模式（或全部）日志。
 *
 * @param id - 项目 id
 * @param profileId - 模式 id；空则合并全部
 * @param limit - 条数
 * @returns 日志行
 */
export function getProjectLogs(
  id: string,
  profileId: string | null | undefined,
  limit = 200,
) {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const profiles = resolveStartProfiles(current);
  if (profileId) {
    findStartProfile(profiles, profileId);
    return processManager.getLogs(runtimeKey(id, profileId), limit);
  }
  const merged = [
    ...profiles.flatMap((profile) =>
      processManager.getLogs(runtimeKey(id, profile.id), limit).map((line) => ({
        ...line,
        text: `[${profile.name}] ${line.text}`,
      })),
    ),
    ...processManager.getLogs(runtimeKey(id, '__install__'), limit).map((line) => ({
      ...line,
      text: `[安装依赖] ${line.text}`,
    })),
  ];
  merged.sort((a, b) => a.ts.localeCompare(b.ts));
  return merged.slice(-limit);
}

/**
 * 从 origin 快进更新。
 *
 * @param id - 项目 id
 * @returns 视图
 */
export async function syncProject(id: string): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const absolutePath = resolveProjectPath(current.path);
  await pullOrigin(absolutePath, current.branch);
  return toProjectView(current);
}

/**
 * 在项目目录用 shell 执行命令（安装依赖等）。
 *
 * @param commandLine - 完整命令行
 * @param cwd - 工作目录
 * @returns {Promise<void>}
 * @throws {Error} 非 0 退出时抛出
 */
function runShell(commandLine: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(commandLine, {
      cwd,
      shell: true,
      stdio: 'inherit',
      windowsHide: true,
      env: process.env,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`命令失败（exit ${code}）：${commandLine}`));
    });
  });
}

export { DEFAULT_PROFILE_ID };
