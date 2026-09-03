import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, ensureDirs } from './store.js';

/** 持久化运行态路径 */
export const RUNTIME_STORE_PATH = path.join(DATA_DIR, 'runtime.json');

export type PersistedRuntime = {
  pid: number;
  startedAt: string;
  command: string;
  cwd: string;
};

type RuntimeFile = {
  version: number;
  processes: Record<string, PersistedRuntime>;
};

/**
 * 读取全部持久化运行态。
 *
 * @returns 项目 id → 运行快照
 */
export function loadRuntimeStore(): Record<string, PersistedRuntime> {
  ensureDirs();
  if (!fs.existsSync(RUNTIME_STORE_PATH)) {
    return {};
  }
  try {
    const raw = JSON.parse(fs.readFileSync(RUNTIME_STORE_PATH, 'utf8')) as RuntimeFile;
    return raw.processes && typeof raw.processes === 'object' ? raw.processes : {};
  } catch {
    return {};
  }
}

/**
 * 覆盖写入运行态清单。
 *
 * @param processes - 完整映射
 * @returns {void}
 */
export function saveRuntimeStore(processes: Record<string, PersistedRuntime>): void {
  ensureDirs();
  const payload: RuntimeFile = { version: 1, processes };
  fs.writeFileSync(RUNTIME_STORE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

/**
 * 写入或更新单个项目的持久化运行态。
 *
 * @param projectId - 项目 id
 * @param snapshot - 运行快照
 * @returns {void}
 */
export function upsertRuntime(projectId: string, snapshot: PersistedRuntime): void {
  const processes = loadRuntimeStore();
  processes[projectId] = snapshot;
  saveRuntimeStore(processes);
}

/**
 * 删除单个项目的持久化运行态。
 *
 * @param projectId - 项目 id
 * @returns {void}
 */
export function clearRuntime(projectId: string): void {
  const processes = loadRuntimeStore();
  if (!(projectId in processes)) {
    return;
  }
  delete processes[projectId];
  saveRuntimeStore(processes);
}

/**
 * 读取单个项目持久化运行态。
 *
 * @param projectId - 项目 id
 * @returns 快照或 null
 */
export function getPersistedRuntime(projectId: string): PersistedRuntime | null {
  return loadRuntimeStore()[projectId] ?? null;
}
