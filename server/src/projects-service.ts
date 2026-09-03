import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { spawn } from 'node:child_process';
import {
  cloneRepository,
  deriveProjectId,
  isGitRepo,
  pullOrigin,
  readGitSummary,
  sanitizeId,
} from './git.js';
import { hasProjectAnalysis } from './analysis.js';
import { extractRuntimeUrls } from './log-urls.js';
import { processManager } from './process-manager.js';
import {
  findProject,
  loadProjects,
  PROJECTS_DIR,
  removeProject,
  resolveProjectPath,
  upsertProject,
} from './store.js';
import { normalizeTags } from './tags.js';
import type { ProjectRecord, ProjectView } from './types.js';

const tagsSchema = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => normalizeTags(value));

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
  /** 跳过克隆，登记已有本地目录（绝对路径或相对 labhub 根） */
  localPath: z.string().optional(),
  shallow: z.boolean().default(true),
  skipInstall: z.boolean().default(false),
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
});

/**
 * 组装控制台所需的项目视图（含 git + 运行态）。
 *
 * @param record - 持久化记录
 * @returns 视图对象
 */
export async function toProjectView(record: ProjectRecord): Promise<ProjectView> {
  const absolutePath = resolveProjectPath(record.path);
  const exists = fs.existsSync(absolutePath);
  const gitRepo = exists && isGitRepo(absolutePath);
  const git = gitRepo ? await readGitSummary(absolutePath) : null;
  const recentLogs = processManager.getLogs(record.id, 80);
  const runtimeUrls = extractRuntimeUrls(recentLogs);
  const probeUrls = [record.openUrl, ...runtimeUrls].filter(
    (item): item is string => Boolean(item),
  );
  const runtime = await processManager.getRuntime(record.id, probeUrls);
  return {
    ...record,
    openUrl: record.openUrl ?? null,
    tags: normalizeTags(record.tags),
    absolutePath,
    exists,
    isGitRepo: Boolean(gitRepo),
    git,
    runtime,
    recentLogs: recentLogs.slice(-30),
    runtimeUrls,
    hasAnalysis: hasProjectAnalysis(record.path),
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
 * origin 即为传入的 repoUrl，在 projects/<id> 内 git commit/push 会回到源仓库。
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

  const record: ProjectRecord = {
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
  };
  upsertProject(record);
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
  const next: ProjectRecord = {
    ...current,
    ...patch,
    tags: patch.tags !== undefined ? normalizeTags(patch.tags) : normalizeTags(current.tags),
    updatedAt: new Date().toISOString(),
  };
  upsertProject(next);
  return toProjectView(next);
}

/**
 * 从清单移除项目；可选删除 projects 下目录（仅限 projects/ 内）。
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
  const probeUrls = current.openUrl ? [current.openUrl] : [];
  const runtime = await processManager.getRuntime(id, probeUrls);
  if (runtime.status === 'running' || runtime.status === 'starting') {
    throw new Error('请先停止项目再删除');
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
 * 启动已登记项目。
 *
 * @param id - 项目 id
 * @returns 运行态视图
 * @throws {Error} 目录缺失等
 */
export async function startProject(id: string): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const absolutePath = resolveProjectPath(current.path);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`项目目录不存在，请先重新拉取：${absolutePath}`);
  }
  const probeUrls = [current.openUrl].filter((item): item is string => Boolean(item));
  await processManager.start(id, absolutePath, current.startCommand, probeUrls);
  return toProjectView(current);
}

/**
 * 停止项目。
 *
 * @param id - 项目 id
 * @returns 视图
 */
export async function stopProject(id: string): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const probeUrls = [current.openUrl].filter((item): item is string => Boolean(item));
  await processManager.stop(id, probeUrls);
  return toProjectView(current);
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
