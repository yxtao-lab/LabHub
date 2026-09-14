import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { spawn } from 'node:child_process';
import { hasProjectAnalysis } from './analysis.js';
import { generateAnalysisOnFirstManage } from './analysis-deepseek.js';
import { pushCatalogIfLoggedIn } from './catalog-sync.js';
import { cloudFetchMe } from './cloud-client.js';
import { detectDependencyState } from './dependency-state.js';
import {
  checkoutProjectBranch,
  cloneRepository,
  deriveProjectId,
  isGitRepo,
  listProjectBranches,
  pullOrigin,
  readGitSummary,
  sanitizeId,
  type GitCloneProgress,
} from './git.js';
import { extractRuntimeUrls, mergeDetectedAndConfiguredUrls } from './log-urls.js';
import { openBrowserPreferDetected } from './open-browser.js';
import { processManager } from './process-manager.js';
import {
  DEFAULT_PROFILE_ID,
  buildRuntimeKey,
  findBuildProfile,
  findStartProfile,
  isBuildRuntimeProfileId,
  normalizeProjectRecord,
  parseBuildProfileId,
  resolveBuildProfiles,
  resolveDefaultBuildProfileId,
  resolveDefaultProfileId,
  resolvePhases,
  resolveStartProfiles,
  runtimeKey,
} from './profiles.js';
import { inferProjectProfiles, refreshRecordProfiles, detectPackageManager, defaultInstallCommand, isGenericNpmInstall } from './package-profiles.js';
import {
  findCategory,
  findProject,
  loadProjects,
  PROJECTS_DIR,
  removeProject,
  resolveProjectPath,
  upsertProject,
} from './store.js';
import { normalizeTags } from './tags.js';
import { syncCursorWorkspaceFile, openCursorWorkspace } from './workspace-sync.js';
import type {
  BuildProfile,
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

const categoryIdSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  });

const startProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  command: z.string().min(1),
  openUrl: z.string().url().nullable().optional(),
  cwd: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  description: z.string().optional(),
});

const buildProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  command: z.string().min(1),
  cwd: z.string().nullable().optional(),
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
  branch: z.string().default(''),
  startCommand: z.string().default(''),
  installCommand: z.string().default('npm install'),
  openUrl: z.string().url().nullable().optional(),
  upstreamUrl: z.string().nullable().optional(),
  tags: tagsSchema,
  categoryId: categoryIdSchema,
  notes: z.string().optional(),
  localPath: z.string().optional(),
  shallow: z.boolean().default(true),
  skipInstall: z.boolean().default(true),
  startProfiles: z.array(startProfileSchema).optional(),
  defaultProfileId: z.string().nullable().optional(),
  buildProfiles: z.array(buildProfileSchema).optional(),
  defaultBuildProfileId: z.string().nullable().optional(),
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
  categoryId: categoryIdSchema,
  notes: z.string().optional(),
  branch: z.string().min(1).optional(),
  startProfiles: z.array(startProfileSchema).optional(),
  defaultProfileId: z.string().nullable().optional(),
  buildProfiles: z.array(buildProfileSchema).optional(),
  defaultBuildProfileId: z.string().nullable().optional(),
  phases: z.array(phaseSchema).optional(),
  currentPhase: z.string().nullable().optional(),
});

/**
 * 校验并规范化 categoryId；空值视为未分类。
 *
 * @param categoryId - 请求中的分类 id
 * @returns 合法 categoryId 或 null
 * @throws {Error} 分类不存在时抛出
 */
function resolveCategoryId(categoryId: string | null | undefined): string | null {
  if (categoryId === undefined || categoryId === null || categoryId === '') {
    return null;
  }
  if (!findCategory(categoryId)) {
    throw new Error(`分类不存在：${categoryId}`);
  }
  return categoryId;
}
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
function resolveProfileCwd(
  projectRoot: string,
  profile: { cwd?: string | null },
): string {
  const root = path.resolve(projectRoot);
  if (!profile.cwd) {
    return root;
  }
  const target = path.resolve(root, profile.cwd);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new Error(`工作目录 cwd 越界：${profile.cwd}`);
  }
  if (!fs.existsSync(target)) {
    throw new Error(`工作目录不存在：${target}`);
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
  const buildProfiles = resolveBuildProfiles(normalized);
  const defaultBuildProfileId = resolveDefaultBuildProfileId(normalized, buildProfiles);

  const profileRuntimes: ProfileRuntimeView[] = [];
  const allLogs: LogLine[] = [];

  for (const profile of startProfiles) {
    const key = runtimeKey(normalized.id, profile.id);
    const recentLogs = processManager.getLogs(key, 120);
    const runtimeUrls = extractRuntimeUrls(recentLogs);
    const probeUrls = mergeDetectedAndConfiguredUrls(runtimeUrls, [profile.openUrl]);
    const runtime = await processManager.getRuntime(key, probeUrls);
    profileRuntimes.push({
      profile,
      runtime: { ...runtime, profileId: profile.id },
      runtimeUrls,
    });
    allLogs.push(...recentLogs);
  }

  allLogs.sort((a, b) => a.ts.localeCompare(b.ts));
  const uniqueUrls = mergeDetectedAndConfiguredUrls(
    profileRuntimes.flatMap((item) => item.runtimeUrls),
    [
      normalized.openUrl,
      ...profileRuntimes.map((item) => item.profile.openUrl),
    ],
  );
  const dependency = exists
    ? detectDependencyState(absolutePath)
    : { depsInstalled: false, needsInstall: false };

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
    depsInstalled: dependency.depsInstalled,
    needsInstall: dependency.needsInstall,
    startProfiles,
    defaultProfileId,
    buildProfiles,
    defaultBuildProfileId,
    phases: resolvePhases(normalized),
    currentPhase: normalized.currentPhase ?? null,
  };
}

/**
 * 列出全部项目视图；顺带把不完整的启动/构建模式从 package.json 补全。
 *
 * @returns 项目视图数组
 */
export async function listProjectViews(): Promise<ProjectView[]> {
  const projects = loadProjects();
  return Promise.all(projects.map((item) => toProjectView(item)));
}

/**
 * 为清单内全部项目补全启动 / 构建模式（相对 package.json 全面）。
 *
 * @returns 已更新的项目 id 列表
 */
export async function ensureComprehensiveProfiles(): Promise<string[]> {
  const updated: string[] = [];
  for (const record of loadProjects()) {
    const root = resolveProjectPath(record.path);
    const next = refreshRecordProfiles(record, root);
    if (!next) {
      continue;
    }
    upsertProject(normalizeProjectRecord(next));
    updated.push(record.id);
  }
  if (updated.length > 0) {
    await pushCatalogIfLoggedIn();
    console.log(`[labhub] 已补全启动/构建模式：${updated.join(', ')}`);
  }
  return updated;
}

/** 添加项目过程进度事件（供流式接口推送） */
export type AddProjectProgressEvent =
  | {
      type: 'status';
      phase: 'prepare' | 'clone' | 'install' | 'analyze' | 'done';
      message: string;
    }
  | {
      type: 'clone-progress';
      stage: string;
      percent: number;
      received: number;
      total: number;
      remaining: number;
      speed: string | null;
      raw: string;
    }
  | {
      type: 'install-log';
      line: string;
    };

export type AddProjectProgressHandler = (event: AddProjectProgressEvent) => void;

/**
 * 通过 GitHub/Gitee 地址克隆并登记；或挂载已有本地路径。
 *
 * @param input - 校验后的入参
 * @param onProgress - 可选进度回调（流式登记用）
 * @returns 新建项目视图
 * @throws {Error} id 冲突或克隆失败时抛出
 */
export async function addProject(
  input: z.infer<typeof addProjectSchema>,
  onProgress?: AddProjectProgressHandler,
): Promise<ProjectView> {
  const emit = (event: AddProjectProgressEvent) => {
    try {
      onProgress?.(event);
    } catch {
      // 忽略进度回调异常，避免中断主流程
    }
  };

  const me = await cloudFetchMe();
  if (me?.projectLimit != null) {
    const currentCount = loadProjects().length;
    if (currentCount >= me.projectLimit) {
      const error = new Error(
        `已达项目管理上限（${me.projectLimit} 个）。请升级基础版扩容，或邀请好友注册（双方各 +1）`,
      ) as Error & { status?: number; code?: string };
      error.status = 403;
      error.code = 'PROJECT_LIMIT';
      throw error;
    }
  }

  const id = sanitizeId(input.id ?? deriveProjectId(input.repoUrl));
  if (findProject(id)) {
    throw new Error(`项目 id 已存在：${id}`);
  }

  const now = new Date().toISOString();
  let relativePath: string;
  let absolutePath: string;
  let branch = input.branch?.trim() || '';

  if (input.localPath) {
    emit({ type: 'status', phase: 'prepare', message: '正在挂载本地路径…' });
    absolutePath = path.isAbsolute(input.localPath)
      ? input.localPath
      : path.resolve(PROJECTS_DIR, '..', input.localPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`本地路径不存在：${absolutePath}`);
    }
    relativePath = absolutePath;
    if (!branch) {
      const summary = await readGitSummary(absolutePath);
      branch = summary?.branch || 'main';
    }
  } else {
    relativePath = path.join('projects', id);
    absolutePath = path.join(PROJECTS_DIR, id);
    if (fs.existsSync(absolutePath)) {
      // 上次已克隆成功但登记失败时，直接挂载已有目录，避免「目标目录已存在」
      if (!isGitRepo(absolutePath)) {
        throw new Error(
          `目标目录已存在但不是 Git 仓库：${absolutePath}。请手动清理后重试，或换项目 id。`,
        );
      }
      emit({
        type: 'status',
        phase: 'prepare',
        message: '检测到本地已有克隆，正在登记…',
      });
      const summary = await readGitSummary(absolutePath);
      if (!branch) {
        branch = summary?.branch || 'main';
      }
      if (summary?.origin) {
        const normalize = (url: string) =>
          url.trim().replace(/\.git$/i, '').replace(/\/$/, '').toLowerCase();
        if (normalize(summary.origin) !== normalize(input.repoUrl)) {
          throw new Error(
            `本地目录 origin（${summary.origin}）与填写的仓库地址不一致。请删除 ${absolutePath} 后重新克隆。`,
          );
        }
      }
    } else {
      emit({ type: 'status', phase: 'clone', message: '开始克隆远程仓库…' });
      const cloned = await cloneRepository({
        repoUrl: input.repoUrl,
        targetDir: absolutePath,
        branch: branch || null,
        shallow: input.shallow,
        upstreamUrl: input.upstreamUrl ?? null,
        onStatus: (message) => emit({ type: 'status', phase: 'clone', message }),
        onProgress: (progress: GitCloneProgress) =>
          emit({
            type: 'clone-progress',
            stage: progress.stage,
            percent: progress.percent,
            received: progress.received,
            total: progress.total,
            remaining: progress.remaining,
            speed: progress.speed,
            raw: progress.raw,
          }),
      });
      branch = cloned.branch;
      emit({
        type: 'status',
        phase: 'clone',
        message: `克隆完成（分支 ${branch}）`,
      });
    }
  }

  emit({ type: 'status', phase: 'analyze', message: '正在分析启动 / 构建模式…' });
  const inferred = inferProjectProfiles(absolutePath, {
    openUrl: input.openUrl ?? null,
    previous: {
      id,
      name: input.name ?? id,
      repoUrl: input.repoUrl,
      branch,
      path: relativePath,
      startCommand: input.startCommand.trim(),
      installCommand: input.installCommand,
      openUrl: input.openUrl ?? null,
      upstreamUrl: input.upstreamUrl ?? null,
      tags: normalizeTags(input.tags),
      categoryId: resolveCategoryId(input.categoryId),
      createdAt: now,
      updatedAt: now,
      notes: input.notes ?? '',
      startProfiles: input.startProfiles,
      buildProfiles: input.buildProfiles,
      defaultProfileId: input.defaultProfileId ?? null,
      defaultBuildProfileId: input.defaultBuildProfileId ?? null,
    },
  });

  const userInstall = (input.installCommand || '').trim();
  const installCommand = isGenericNpmInstall(userInstall)
    ? inferred.installCommand
    : userInstall || inferred.installCommand;

  if (!input.skipInstall && installCommand) {
    if (inferred.kind === 'node' || inferred.kind === 'python') {
      emit({
        type: 'status',
        phase: 'install',
        message: `正在安装依赖：${installCommand}`,
      });
      await runShell(installCommand, absolutePath, (line) =>
        emit({ type: 'install-log', line }),
      );
    }
  }

  const record = normalizeProjectRecord({
    id,
    name: input.name ?? id,
    repoUrl: input.repoUrl,
    branch,
    path: relativePath,
    startCommand: inferred.startCommand,
    installCommand,
    openUrl: input.openUrl ?? null,
    upstreamUrl: input.upstreamUrl ?? null,
    tags: normalizeTags(input.tags),
    categoryId: resolveCategoryId(input.categoryId),
    createdAt: now,
    updatedAt: now,
    notes: input.notes ?? '',
    startProfiles: inferred.startProfiles,
    defaultProfileId: inferred.defaultProfileId,
    buildProfiles: inferred.buildProfiles,
    defaultBuildProfileId: inferred.defaultBuildProfileId,
    phases: input.phases,
    currentPhase: input.currentPhase ?? null,
  });
  upsertProject(record);
  emit({ type: 'status', phase: 'analyze', message: '正在生成项目分析…' });
  try {
    await generateAnalysisOnFirstManage(record);
  } catch (error) {
    console.warn('[labhub] 首次托管分析失败（不阻断登记）', error);
  }
  await pushCatalogIfLoggedIn();
  emit({ type: 'status', phase: 'done', message: '登记完成' });
  syncCursorWorkspaceFile();
  try {
    openCursorWorkspace();
  } catch (error) {
    console.warn(
      '[labhub] 自动打开 Cursor 工作区失败（可在控制台点「打开 Git 工作区」）',
      error instanceof Error ? error.message : error,
    );
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
    categoryId:
      patch.categoryId !== undefined
        ? resolveCategoryId(patch.categoryId)
        : current.categoryId ?? null,
    updatedAt: new Date().toISOString(),
  });
  upsertProject(next);
  await pushCatalogIfLoggedIn();
  return toProjectView(next);
}

/**
 * 从仓库清单（package.json / Python）同步启动 / 构建模式。
 *
 * @param id - 项目 id
 * @returns 更新后视图
 * @throws {Error} 项目不存在或目录缺失
 */
export async function syncProfilesFromPackage(id: string): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const absolutePath = resolveProjectPath(current.path);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`项目目录不存在：${absolutePath}`);
  }
  const inferred = inferProjectProfiles(absolutePath, {
    previous: current,
    openUrl: current.openUrl,
  });
  const next = normalizeProjectRecord({
    ...current,
    startCommand: inferred.startCommand,
    installCommand: isGenericNpmInstall(current.installCommand)
      ? inferred.installCommand
      : current.installCommand || inferred.installCommand,
    startProfiles: inferred.startProfiles,
    buildProfiles: inferred.buildProfiles,
    defaultProfileId: inferred.defaultProfileId,
    defaultBuildProfileId: inferred.defaultBuildProfileId,
    updatedAt: new Date().toISOString(),
  });
  upsertProject(next);
  await pushCatalogIfLoggedIn();
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
  await pushCatalogIfLoggedIn();
  syncCursorWorkspaceFile();
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
  const dependency = detectDependencyState(absolutePath);
  if (dependency.needsInstall) {
    throw new Error('请先点击「安装依赖」，完成后再启动项目');
  }
  const profiles = resolveStartProfiles(current);
  const profile = findStartProfile(
    profiles,
    profileId || resolveDefaultProfileId(current, profiles),
  );
  const cwd = resolveProfileCwd(absolutePath, profile);
  const key = runtimeKey(id, profile.id);
  const probeUrls = [profile.openUrl].filter((item): item is string => Boolean(item));
  await processManager.start(key, cwd, profile.command, probeUrls);
  void openBrowserPreferDetected({
    getDetectedUrls: () => extractRuntimeUrls(processManager.getLogs(key, 200)),
    fallbackUrl: profile.openUrl,
  }).catch(() => {
    // 打开失败不阻断启动
  });
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
  let command = current.installCommand || 'npm install';
  if (isGenericNpmInstall(command)) {
    const pm = detectPackageManager(absolutePath);
    const detected = defaultInstallCommand(pm);
    if (detected !== command) {
      command = detected;
      const next = normalizeProjectRecord({
        ...current,
        installCommand: detected,
        updatedAt: new Date().toISOString(),
      });
      upsertProject(next);
      await pushCatalogIfLoggedIn();
    }
  }
  const key = runtimeKey(id, '__install__');
  await processManager.start(key, absolutePath, command, []);
  return toProjectView(findProject(id) ?? current);
}

/**
 * 按构建目标执行 build（如 pnpm build:packages）。
 *
 * @param id - 项目 id
 * @param buildProfileId - 构建目标 id；空则用默认
 * @returns 视图
 * @throws {Error} 项目/目标不存在或启动失败时抛出
 */
export async function buildProject(
  id: string,
  buildProfileId?: string | null,
): Promise<ProjectView> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const absolutePath = resolveProjectPath(current.path);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`项目目录不存在：${absolutePath}`);
  }
  const dependency = detectDependencyState(absolutePath);
  if (dependency.needsInstall) {
    throw new Error('请先点击「安装依赖」，完成后再构建');
  }
  const profiles = resolveBuildProfiles(current);
  const profile = findBuildProfile(
    profiles,
    buildProfileId || resolveDefaultBuildProfileId(current, profiles),
  );
  const cwd = resolveProfileCwd(absolutePath, profile);
  const key = buildRuntimeKey(id, profile.id);
  await processManager.start(key, cwd, profile.command, []);
  return toProjectView(current);
}

/**
 * 读取某模式（或全部）日志。
 *
 * @param id - 项目 id
 * @param profileId - 启动模式 id；或以 `build:` 前缀表示构建目标；空则合并全部
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
  const startProfiles = resolveStartProfiles(current);
  const buildProfiles = resolveBuildProfiles(current);

  if (profileId) {
    if (profileId.startsWith('build:')) {
      const buildId = profileId.slice('build:'.length);
      const profile = findBuildProfile(buildProfiles, buildId);
      return processManager.getLogs(buildRuntimeKey(id, profile.id), limit);
    }
    if (isBuildRuntimeProfileId(profileId)) {
      const buildId = parseBuildProfileId(profileId);
      const profile = findBuildProfile(buildProfiles, buildId);
      return processManager.getLogs(buildRuntimeKey(id, profile.id), limit);
    }
    findStartProfile(startProfiles, profileId);
    return processManager.getLogs(runtimeKey(id, profileId), limit);
  }

  const merged = [
    ...startProfiles.flatMap((profile) =>
      processManager.getLogs(runtimeKey(id, profile.id), limit).map((line) => ({
        ...line,
        text: `[${profile.name}] ${line.text}`,
      })),
    ),
    ...processManager.getLogs(runtimeKey(id, '__install__'), limit).map((line) => ({
      ...line,
      text: `[安装依赖] ${line.text}`,
    })),
    ...buildProfiles.flatMap((profile) =>
      processManager.getLogs(buildRuntimeKey(id, profile.id), limit).map((line) => ({
        ...line,
        text: `[构建:${profile.name}] ${line.text}`,
      })),
    ),
  ];
  merged.sort((a, b) => a.ts.localeCompare(b.ts));
  return merged.slice(-limit);
}

/**
 * 清空某模式（或全部）日志缓冲；不影响进程运行。
 *
 * @param id - 项目 id
 * @param profileId - 启动模式 id；或以 `build:` 前缀表示构建目标；空则清空全部相关缓冲
 * @returns void
 */
export function clearProjectLogs(
  id: string,
  profileId: string | null | undefined,
): void {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const startProfiles = resolveStartProfiles(current);
  const buildProfiles = resolveBuildProfiles(current);

  if (profileId) {
    if (profileId.startsWith('build:')) {
      const buildId = profileId.slice('build:'.length);
      const profile = findBuildProfile(buildProfiles, buildId);
      processManager.clearLogs(buildRuntimeKey(id, profile.id));
      return;
    }
    if (isBuildRuntimeProfileId(profileId)) {
      const buildId = parseBuildProfileId(profileId);
      const profile = findBuildProfile(buildProfiles, buildId);
      processManager.clearLogs(buildRuntimeKey(id, profile.id));
      return;
    }
    findStartProfile(startProfiles, profileId);
    processManager.clearLogs(runtimeKey(id, profileId));
    return;
  }

  for (const profile of startProfiles) {
    processManager.clearLogs(runtimeKey(id, profile.id));
  }
  processManager.clearLogs(runtimeKey(id, '__install__'));
  for (const profile of buildProfiles) {
    processManager.clearLogs(buildRuntimeKey(id, profile.id));
  }
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
 * 列出项目本地 / 远程分支。
 *
 * @param id - 项目 id
 * @returns 当前分支与分支列表
 * @throws {Error} 项目或仓库不存在时抛出
 */
export async function listBranchesForProject(id: string): Promise<{
  current: string | null;
  branches: string[];
}> {
  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const absolutePath = resolveProjectPath(current.path);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`项目目录不存在：${absolutePath}`);
  }
  return listProjectBranches(absolutePath);
}

/**
 * 切换项目分支，并回写清单中的 branch 字段。
 *
 * @param id - 项目 id
 * @param branch - 目标分支
 * @param onProgress - 可选进度回调（流式切分支用）
 * @returns 更新后视图
 * @throws {Error} 运行中或切换失败时抛出
 */
export async function checkoutBranchForProject(
  id: string,
  branch: string,
  onProgress?: AddProjectProgressHandler,
): Promise<ProjectView> {
  const emit = (event: AddProjectProgressEvent) => {
    try {
      onProgress?.(event);
    } catch {
      // 忽略进度回调异常
    }
  };

  const current = findProject(id);
  if (!current) {
    throw new Error(`项目不存在：${id}`);
  }
  const view = await toProjectView(current);
  if (view.runtime.status === 'running' || view.runtime.status === 'starting') {
    throw new Error('请先停止项目再切换分支');
  }
  const absolutePath = resolveProjectPath(current.path);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`项目目录不存在：${absolutePath}`);
  }

  emit({
    type: 'status',
    phase: 'clone',
    message: `正在切换到分支 ${branch.trim()}…`,
  });
  const result = await checkoutProjectBranch(absolutePath, branch, {
    onStatus: (message) => emit({ type: 'status', phase: 'clone', message }),
    onProgress: (progress) =>
      emit({
        type: 'clone-progress',
        stage: progress.stage,
        percent: progress.percent,
        received: progress.received,
        total: progress.total,
        remaining: progress.remaining,
        speed: progress.speed,
        raw: progress.raw,
      }),
  });
  emit({
    type: 'status',
    phase: 'done',
    message: `已切换到 ${result.branch}`,
  });
  const next = normalizeProjectRecord({
    ...current,
    branch: result.branch,
    updatedAt: new Date().toISOString(),
  });
  upsertProject(next);
  await pushCatalogIfLoggedIn();
  return toProjectView(next);
}

/**
 * 在项目目录用 shell 执行命令（安装依赖等）。
 *
 * @param commandLine - 完整命令行
 * @param cwd - 工作目录
 * @returns {Promise<void>}
 * @throws {Error} 非 0 退出时抛出
 */
/**
 * 在项目目录执行 shell 命令；可把输出按行回调。
 *
 * @param commandLine - 命令行
 * @param cwd - 工作目录
 * @param onLine - 可选输出行回调
 * @returns {Promise<void>}
 * @throws {Error} 非 0 退出码时抛出
 */
function runShell(
  commandLine: string,
  cwd: string,
  onLine?: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(commandLine, {
      cwd,
      shell: true,
      stdio: onLine ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      windowsHide: true,
      env: process.env,
    });
    let buffer = '';
    const flush = (chunk: Buffer) => {
      if (!onLine) {
        return;
      }
      buffer += chunk.toString();
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? '';
      for (const line of parts) {
        const trimmed = line.trim();
        if (trimmed) {
          onLine(trimmed.slice(0, 240));
        }
      }
    };
    child.stdout?.on('data', flush);
    child.stderr?.on('data', flush);
    child.on('error', reject);
    child.on('close', (code) => {
      if (buffer.trim() && onLine) {
        onLine(buffer.trim().slice(0, 240));
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`命令失败（exit ${code}）：${commandLine}`));
    });
  });
}

export { DEFAULT_PROFILE_ID };
