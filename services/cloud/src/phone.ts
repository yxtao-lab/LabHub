/**
 * 校验并规范化大陆手机号为 11 位数字。
 *
 * @param raw - 原始输入
 * @returns 11 位手机号
 * @throws {Error} 格式非法
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let phone = digits;
  if (phone.startsWith('86') && phone.length === 13) {
    phone = phone.slice(2);
  }
  if (!/^1\d{10}$/.test(phone)) {
    throw new Error('手机号格式无效，请使用大陆 11 位手机号');
  }
  return phone;
}

/**
 * 手机号脱敏展示。
 *
 * @param phone - 11 位手机号
 * @returns 如 138****5678
 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) {
    return '****';
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
