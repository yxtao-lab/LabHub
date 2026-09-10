import type { ProjectPhase, ProjectRecord, StartProfile } from './types.js';

/** 默认启动模式 id（兼容旧清单） */
export const DEFAULT_PROFILE_ID = 'default';

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
  return {
    ...record,
    startCommand: defaultProfile?.command ?? record.startCommand ?? 'npm run dev',
    openUrl: defaultProfile?.openUrl ?? record.openUrl ?? null,
    startProfiles,
    defaultProfileId,
    phases: resolvePhases(record),
    currentPhase: record.currentPhase ?? null,
    tags: record.tags ?? [],
    notes: record.notes ?? '',
  };
}
