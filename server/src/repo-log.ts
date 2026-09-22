import type { LogLine } from './types.js';

const MAX_LINES = 500;
const logsByProject = new Map<string, LogLine[]>();

/**
 * 追加一条仓库操作日志。
 *
 * @param projectId - 项目 id
 * @param stream - 输出流类型
 * @param text - 文案
 * @returns {void}
 */
export function appendRepoLog(
  projectId: string,
  stream: LogLine['stream'],
  text: string,
): void {
  const line: LogLine = {
    ts: new Date().toISOString(),
    stream,
    text,
  };
  const existing = logsByProject.get(projectId) ?? [];
  existing.push(line);
  if (existing.length > MAX_LINES) {
    existing.splice(0, existing.length - MAX_LINES);
  }
  logsByProject.set(projectId, existing);
}

/**
 * 读取仓库操作日志。
 *
 * @param projectId - 项目 id
 * @param limit - 最多条数
 * @returns 日志行
 */
export function getRepoLogs(projectId: string, limit = 300): LogLine[] {
  const all = logsByProject.get(projectId) ?? [];
  if (limit <= 0 || all.length <= limit) {
    return [...all];
  }
  return all.slice(-limit);
}

/**
 * 清空仓库操作日志。
 *
 * @param projectId - 项目 id
 * @returns {void}
 */
export function clearRepoLogs(projectId: string): void {
  logsByProject.delete(projectId);
}
