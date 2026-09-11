import type { LogLine } from './types.js';

/** 去掉终端颜色码，避免 Vite 着色后抽不出 URL */
const ANSI_ESCAPE = /\u001b(?:\[[0-9;]*[A-Za-z]|].*?(?:\u0007|\u001b\\))/g;

/** 匹配日志中常见的本机 / 局域网 HTTP(S) 地址 */
const RUNTIME_URL_PATTERN =
  /https?:\/\/(?:\[[^\]]+\]|localhost|127\.0\.0\.1|0\.0\.0\.0|(?:\d{1,3}\.){3}\d{1,3})(?::\d{2,5})?(?:\/[^\s"'`<>\u001b]*)?/gi;

/**
 * 去掉 ANSI 转义，便于从着色日志里截取 URL。
 *
 * @param text - 原始日志
 * @returns 纯文本
 */
function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE, '');
}

/**
 * 规范化运行地址：去掉尾部标点，并将 [::] / localhost / 0.0.0.0 转为 127.0.0.1 便于浏览器打开。
 *
 * @param raw - 日志中截取的原始 URL
 * @returns 规范化后的 URL；无法解析时返回 null
 */
export function normalizeRuntimeUrl(raw: string): string | null {
  let value = stripAnsi(raw).trim().replace(/[),.;\]}>]+$/g, '');
  if (!/^https?:\/\//i.test(value)) {
    return null;
  }
  value = value
    .replace(/:\/\/\[::\]/gi, '://127.0.0.1')
    .replace(/:\/\/\[::1\]/gi, '://127.0.0.1')
    .replace(/:\/\/localhost/gi, '://127.0.0.1')
    .replace(/:\/\/0\.0\.0\.0/gi, '://127.0.0.1');
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
 * 判断是否为本机回环地址（优先展示 / 打开）。
 *
 * @param url - 规范化 URL
 * @returns 是否回环
 */
export function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return false;
  }
}

/**
 * 对探测到的地址排序：回环优先，同组保持发现顺序（较新的在后则反转取末尾时已偏新）。
 *
 * @param urls - 地址列表
 * @returns 排序后的新数组
 */
export function rankRuntimeUrls(urls: string[]): string[] {
  const unique = [...new Set(urls.filter(Boolean))];
  return unique.sort((a, b) => {
    const la = isLoopbackUrl(a) ? 0 : 1;
    const lb = isLoopbackUrl(b) ? 0 : 1;
    if (la !== lb) {
      return la - lb;
    }
    return 0;
  });
}

/**
 * 选取最适合打开浏览器的地址。
 *
 * @param urls - 探测到的地址
 * @returns 首选 URL；无则 null
 */
export function pickPrimaryRuntimeUrl(urls: string[]): string | null {
  const ranked = rankRuntimeUrls(urls);
  return ranked[0] ?? null;
}

/**
 * 从日志行中提取去重后的运行地址列表（已排序：回环优先）。
 *
 * @param logs - 日志缓冲
 * @param limit - 最多返回条数
 * @returns 规范化 URL 数组
 */
export function extractRuntimeUrls(logs: LogLine[], limit = 8): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  // 从新到旧扫，便于先抓住 Vite 换端口后的 Local 行
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const line = logs[index];
    if (!line) {
      continue;
    }
    const text = stripAnsi(line.text);
    const matches = text.match(RUNTIME_URL_PATTERN);
    if (!matches) {
      continue;
    }
    // Local: 行优先插入
    const isLocalLine = /\blocal\s*:/i.test(text);
    for (const match of matches) {
      const normalized = normalizeRuntimeUrl(match);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      if (isLocalLine && isLoopbackUrl(normalized)) {
        found.unshift(normalized);
      } else {
        found.push(normalized);
      }
    }
    if (found.length >= limit * 2) {
      break;
    }
  }
  return rankRuntimeUrls(found).slice(0, limit);
}

/**
 * 合并「日志探测」与「登记 openUrl」：探测优先，登记中未出现的作为补充。
 *
 * @param detected - 日志探测
 * @param configured - 清单登记
 * @returns 有序列表（探测在前）
 */
export function mergeDetectedAndConfiguredUrls(
  detected: string[],
  configured: Array<string | null | undefined>,
): string[] {
  const rankedDetected = rankRuntimeUrls(detected);
  const seen = new Set(rankedDetected);
  const extras: string[] = [];
  for (const item of configured) {
    if (!item || seen.has(item)) {
      continue;
    }
    const normalized = normalizeRuntimeUrl(item) ?? item;
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    extras.push(normalized);
  }
  return [...rankedDetected, ...extras];
}
