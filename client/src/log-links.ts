/** 日志中的文本或可点击链接片段 */
export type LogTextPart =
  | { type: 'text'; value: string }
  | { type: 'url'; value: string };

/** 匹配日志里的 http(s) 地址（含 Vite Local / Network 行） */
const LOG_URL_RE = /https?:\/\/[^\s"'`<>]+/gi;

/**
 * 去掉 URL 尾部常被日志粘上的标点，避免链接打不开。
 *
 * @param raw - 正则截取的原始串
 * @returns 可作为 href 的地址；不是 http(s) 时返回空
 */
function trimLogUrl(raw: string): string {
  const trimmed = raw.replace(/[),.;!?\]}>]+$/g, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/**
 * 把日志行拆成纯文本与 URL，便于控制台 Ctrl+点击打开。
 *
 * @param text - 已去掉 ANSI 的日志文本
 * @returns 交替的文本 / 链接片段；无 URL 时整行作为一段文本
 */
export function splitLogTextWithUrls(text: string): LogTextPart[] {
  const parts: LogTextPart[] = [];
  const matcher = new RegExp(LOG_URL_RE.source, 'gi');
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    const href = trimLogUrl(raw);
    if (href) {
      parts.push({ type: 'url', value: href });
      if (href.length < raw.length) {
        parts.push({ type: 'text', value: raw.slice(href.length) });
      }
    } else {
      parts.push({ type: 'text', value: raw });
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}
