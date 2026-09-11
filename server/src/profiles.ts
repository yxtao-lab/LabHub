import type { BuildProfile, ProjectPhase, ProjectRecord, StartProfile } from './types.js';

/** 默认启动模式 id（兼容旧清单） */
export const DEFAULT_PROFILE_ID = 'default';

/** 默认构建目标 id */
export const DEFAULT_BUILD_PROFILE_ID = 'default';

/** 构建运行态键前缀（与启动模式区分） */
export const BUILD_RUNTIME_PREFIX = '__build__:';

/**
 * 组装进程管理键：同一项目不同启动模式可并行。
 *
 * @param projectId - 项目 id
 * @param profileId - 启动模式 id
 * @returns 运行态键
 */
export function runtimeKey(projectId: string, profileId: string): string {
  return `${projectId}::${profileId}`;
}

/**
 * 组装构建任务的运行态键。
 *
 * @param projectId - 项目 id
 * @param buildProfileId - 构建目标 id
 * @returns 运行态键
 */
export function buildRuntimeKey(projectId: string, buildProfileId: string): string {
  return runtimeKey(projectId, `${BUILD_RUNTIME_PREFIX}${buildProfileId}`);
}

/**
 * 判断运行态键是否为构建任务。
 *
 * @param profileId - 复合键中的 profile 段，或完整后缀
 * @returns 是否构建键
 */
export function isBuildRuntimeProfileId(profileId: string): boolean {
  return profileId.startsWith(BUILD_RUNTIME_PREFIX);
}

/**
 * 从构建运行态 profile 段解析构建目标 id。
 *
 * @param profileId - 如 `__build__:packages`
 * @returns 构建目标 id
 */
export function parseBuildProfileId(profileId: string): string {
  if (!isBuildRuntimeProfileId(profileId)) {
    return profileId;
  }
  return profileId.slice(BUILD_RUNTIME_PREFIX.length) || DEFAULT_BUILD_PROFILE_ID;
}

/**
 * 从运行态键解析项目 id 与 profile id。
 *
 * @param key - 运行态键
 * @returns 解析结果；非复合键时 profileId 为 default
 */
export function parseRuntimeKey(key: string): { projectId: string; profileId: string } {
  const sep = key.indexOf('::');
  if (sep <= 0) {
    return { projectId: key, profileId: DEFAULT_PROFILE_ID };
  }
  return {
    projectId: key.slice(0, sep),
    profileId: key.slice(sep + 2) || DEFAULT_PROFILE_ID,
  };
}

/**
 * 将旧版单命令归一为启动模式列表。
 *
 * @param record - 原始项目记录（可能缺 profiles）
 * @returns 至少一条 StartProfile
 */
export function resolveStartProfiles(record: ProjectRecord): StartProfile[] {
  if (Array.isArray(record.startProfiles) && record.startProfiles.length > 0) {
    return record.startProfiles.map((item) => ({
      id: String(item.id || DEFAULT_PROFILE_ID),
      name: String(item.name || item.id || '默认'),
      command: String(item.command || record.startCommand || 'npm run dev'),
      openUrl: item.openUrl ?? null,
      cwd: item.cwd ?? null,
      phase: item.phase ?? null,
      description: item.description ?? '',
    }));
  }
  return [
    {
      id: DEFAULT_PROFILE_ID,
      name: '默认',
      command: record.startCommand || 'npm run dev',
      openUrl: record.openUrl ?? null,
      cwd: null,
      phase: record.currentPhase ?? null,
      description: '',
    },
  ];
}

/**
 * 解析默认启动模式 id。
 *
 * @param record - 项目记录
 * @param profiles - 已归一的 profiles
 * @returns 默认 profile id
 */
export function resolveDefaultProfileId(
  record: ProjectRecord,
  profiles: StartProfile[],
): string {
  if (record.defaultProfileId && profiles.some((item) => item.id === record.defaultProfileId)) {
    return record.defaultProfileId;
  }
  return profiles[0]?.id ?? DEFAULT_PROFILE_ID;
}

/**
 * 按 id 查找启动模式。
 *
 * @param profiles - 模式列表
 * @param profileId - 目标 id；缺省用第一条
 * @returns 命中的模式
 * @throws {Error} 找不到时抛出
 */
export function findStartProfile(
  profiles: StartProfile[],
  profileId?: string | null,
): StartProfile {
  const id = profileId || profiles[0]?.id;
  const hit = profiles.find((item) => item.id === id);
  if (!hit) {
    throw new Error(`启动模式不存在：${profileId ?? '(空)'}`);
  }
  return hit;
}

/**
 * 将清单中的构建目标归一；缺省按安装命令推断一条默认 build。
 *
 * @param record - 原始项目记录
 * @returns 至少一条 BuildProfile
 */
export function resolveBuildProfiles(record: ProjectRecord): BuildProfile[] {
  if (Array.isArray(record.buildProfiles) && record.buildProfiles.length > 0) {
    return record.buildProfiles.map((item) => ({
      id: String(item.id || DEFAULT_BUILD_PROFILE_ID),
      name: String(item.name || item.id || '默认构建'),
      command: String(item.command || 'npm run build'),
      cwd: item.cwd ?? null,
      description: item.description ?? '',
    }));
  }
  const install = (record.installCommand || '').toLowerCase();
  const command = install.includes('pnpm')
    ? 'pnpm run build'
    : install.includes('yarn')
      ? 'yarn build'
      : 'npm run build';
  return [
    {
      id: DEFAULT_BUILD_PROFILE_ID,
      name: '默认构建',
      command,
      cwd: null,
      description: '执行仓库默认 build 脚本',
    },
  ];
}

/**
 * 解析默认构建目标 id。
 *
 * @param record - 项目记录
 * @param profiles - 已归一的构建列表
 * @returns 默认构建 id
 */
export function resolveDefaultBuildProfileId(
  record: ProjectRecord,
  profiles: BuildProfile[],
): string {
  if (
    record.defaultBuildProfileId &&
    profiles.some((item) => item.id === record.defaultBuildProfileId)
  ) {
    return record.defaultBuildProfileId;
  }
  return profiles[0]?.id ?? DEFAULT_BUILD_PROFILE_ID;
}

/**
 * 按 id 查找构建目标。
 *
 * @param profiles - 构建列表
 * @param profileId - 目标 id；缺省用第一条
 * @returns 命中的构建配置
 * @throws {Error} 找不到时抛出
 */
export function findBuildProfile(
  profiles: BuildProfile[],
  profileId?: string | null,
): BuildProfile {
  const id = profileId || profiles[0]?.id;
  const hit = profiles.find((item) => item.id === id);
  if (!hit) {
    throw new Error(`构建目标不存在：${profileId ?? '(空)'}`);
  }
  return hit;
}

/**
 * 归一分期列表（缺省为空数组）。
 *
 * @param record - 项目记录
 * @returns 分期数组
 */
export function resolvePhases(record: ProjectRecord): ProjectPhase[] {
  if (!Array.isArray(record.phases)) {
    return [];
  }
  return record.phases.map((item) => ({
    id: String(item.id),
    name: String(item.name || item.id),
    status: item.status === 'done' || item.status === 'current' || item.status === 'planned'
      ? item.status
      : 'planned',
    summary: String(item.summary ?? ''),
  }));
}

/**
 * 补齐清单字段：profiles / phases / 默认命令镜像。
 *
 * @param record - 原始记录
 * @returns 可落盘的完整记录
 */
export function normalizeProjectRecord(record: ProjectRecord): ProjectRecord {
  const startProfiles = resolveStartProfiles(record);
  const defaultProfileId = resolveDefaultProfileId(record, startProfiles);
  const defaultProfile =
    startProfiles.find((item) => item.id === defaultProfileId) ?? startProfiles[0];
  const buildProfiles = resolveBuildProfiles(record);
  const defaultBuildProfileId = resolveDefaultBuildProfileId(record, buildProfiles);
  return {
    ...record,
    startCommand: defaultProfile?.command ?? record.startCommand ?? 'npm run dev',
    openUrl: defaultProfile?.openUrl ?? record.openUrl ?? null,
    startProfiles,
    defaultProfileId,
    buildProfiles,
    defaultBuildProfileId,
    phases: resolvePhases(record),
    currentPhase: record.currentPhase ?? null,
    tags: record.tags ?? [],
    categoryId: record.categoryId ?? null,
    notes: record.notes ?? '',
  };
}
