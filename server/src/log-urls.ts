import type { LogLine } from './types.js';

/** 匹配日志中常见的本机 / 局域网 HTTP(S) 地址 */
const RUNTIME_URL_PATTERN =
  /https?:\/\/(?:\[[^\]]+\]|localhost|127\.0\.0\.1|(?:\d{1,3}\.){3}\d{1,3})(?::\d{2,5})?(?:\/[^\s"'`<>]*)?/gi;

/**
 * 规范化运行地址：去掉尾部标点，并将 [::] / [::1] 转为 127.0.0.1 便于浏览器打开。
 *
 * @param raw - 日志中截取的原始 URL
 * @returns 规范化后的 URL；无法解析时返回 null
 */
export function normalizeRuntimeUrl(raw: string): string | null {
  let value = raw.trim().replace(/[),.;\]}>]+$/g, '');
  if (!/^https?:\/\//i.test(value)) {
    return null;
  }
  value = value
    .replace(/:\/\/\[::\]/gi, '://127.0.0.1')
    .replace(/:\/\/\[::1\]/gi, '://127.0.0.1')
    .replace(/:\/\/localhost/gi, '://127.0.0.1');
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      return parsed.origin;
    }
    return parsed.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * 从日志行中提取去重后的运行地址列表。
 *
 * @param logs - 日志缓冲
 * @param limit - 最多返回条数
 * @returns 规范化 URL 数组
 */
export function extractRuntimeUrls(logs: LogLine[], limit = 6): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const line of logs) {
    const matches = line.text.match(RUNTIME_URL_PATTERN);
    if (!matches) {
      continue;
    }
    for (const match of matches) {
      const normalized = normalizeRuntimeUrl(match);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      found.push(normalized);
    }
  }
  return found.slice(-limit);
}
