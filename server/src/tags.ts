/**
 * 规范化分类标签：去空白、去空串、去重，保留原有大小写与中文。
 *
 * @param input - 原始标签数组或逗号/空白分隔字符串
 * @returns 规范化后的标签列表
 */
export function normalizeTags(input: string[] | string | null | undefined): string[] {
  const parts = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[,，、\s]+/)
      : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of parts) {
    const tag = raw.trim();
    if (!tag || tag.length > 32) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(tag);
  }
  return result;
}
