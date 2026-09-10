import crypto from 'node:crypto';
import { getDb } from './db.js';

const CODE_TTL_MS = 5 * 60 * 1000;
const PHONE_WINDOW_MS = 60 * 1000;
const PHONE_MAX_PER_WINDOW = 1;
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_PER_WINDOW = 20;

/**
 * 对验证码做哈希存储。
 *
 * @param code - 明文验证码
 * @returns hex 摘要
 */
export function hashSmsCode(code: string): string {
  const salt = process.env.SMS_CODE_SALT || 'labhub-sms';
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

/**
 * 生成 6 位数字验证码。
 *
 * @returns 验证码
 */
export function generateSmsCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * 检查并递增限流计数。
 *
 * @param key - 限流键
 * @param windowMs - 窗口毫秒
 * @param max - 窗口内最大次数
 * @returns 是否允许
 */
function hitRateLimit(key: string, windowMs: number, max: number): boolean {
  const database = getDb();
  const now = Date.now();
  const row = database.prepare('SELECT window_start, count FROM sms_rate WHERE key = ?').get(key) as
    | { window_start: string; count: number }
    | undefined;
  if (!row) {
    database
      .prepare('INSERT INTO sms_rate (key, window_start, count) VALUES (?, ?, 1)')
      .run(key, new Date(now).toISOString());
    return true;
  }
  const start = Date.parse(row.window_start);
  if (Number.isNaN(start) || now - start >= windowMs) {
    database
      .prepare('UPDATE sms_rate SET window_start = ?, count = 1 WHERE key = ?')
      .run(new Date(now).toISOString(), key);
    return true;
  }
  if (row.count >= max) {
    return false;
  }
  database.prepare('UPDATE sms_rate SET count = count + 1 WHERE key = ?').run(key);
  return true;
}

/**
 * 发送短信验证码（dev 打日志；aliyun 走 HTTP OpenAPI 简版）。
 *
 * @param phone - 手机号
 * @param code - 验证码
 * @returns {Promise<void>}
 */
export async function deliverSmsCode(phone: string, code: string): Promise<void> {
  const provider = (process.env.SMS_PROVIDER || 'dev').toLowerCase();
  if (provider === 'dev') {
    console.log(`[cloud-sms-dev] phone=${phone} code=${code}`);
    return;
  }
  if (provider === 'aliyun') {
    await sendAliyunSms(phone, code);
    return;
  }
  throw new Error(`不支持的 SMS_PROVIDER：${provider}`);
}

/**
 * 调用阿里云短信（需配置 AccessKey / 签名 / 模板；模板变量默认 code）。
 *
 * @param phone - 手机号
 * @param code - 验证码
 * @returns {Promise<void>}
 */
async function sendAliyunSms(phone: string, code: string): Promise<void> {
  const accessKeyId = process.env.SMS_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.SMS_ACCESS_KEY_SECRET?.trim();
  const signName = process.env.SMS_SIGN_NAME?.trim();
  const templateCode = process.env.SMS_TEMPLATE_CODE?.trim();
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    throw new Error('阿里云短信未配置完整：SMS_ACCESS_KEY_ID/SECRET、SMS_SIGN_NAME、SMS_TEMPLATE_CODE');
  }

  // 使用阿里云 RPC 签名（简化：通过官方推荐的 OpenAPI 网关风格）
  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone,
    RegionId: process.env.SMS_REGION_ID?.trim() || 'cn-hangzhou',
    SignName: signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2017-05-25',
  };

  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(sorted)}`;
  const signature = crypto
    .createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');
  const url = `https://dysmsapi.aliyuncs.com/?${sorted}&Signature=${encodeURIComponent(signature)}`;
  const response = await fetch(url);
  const raw = await response.text();
  let body: { Code?: string; Message?: string } = {};
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    throw new Error(`阿里云短信返回非 JSON：${raw.slice(0, 200)}`);
  }
  if (body.Code !== 'OK') {
    throw new Error(`阿里云短信失败：${body.Message || body.Code || raw.slice(0, 200)}`);
  }
}

/**
 * 写入并发送验证码。
 *
 * @param phone - 手机号
 * @param ip - 客户端 IP
 * @returns {Promise<void>}
 */
export async function issueSmsCode(phone: string, ip: string): Promise<void> {
  if (!hitRateLimit(`phone:${phone}`, PHONE_WINDOW_MS, PHONE_MAX_PER_WINDOW)) {
    throw new Error('发送过于频繁，请稍后再试');
  }
  if (!hitRateLimit(`ip:${ip}`, IP_WINDOW_MS, IP_MAX_PER_WINDOW)) {
    throw new Error('当前网络发送次数过多，请稍后再试');
  }

  const code =
    process.env.SMS_DEV_CODE?.trim() &&
    (process.env.SMS_PROVIDER || 'dev').toLowerCase() === 'dev'
      ? process.env.SMS_DEV_CODE.trim()
      : generateSmsCode();

  const now = new Date();
  const expires = new Date(now.getTime() + CODE_TTL_MS).toISOString();
  getDb()
    .prepare(
      `INSERT INTO sms_codes (phone, code_hash, expires_at, created_at, send_count)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(phone) DO UPDATE SET
         code_hash = excluded.code_hash,
         expires_at = excluded.expires_at,
         created_at = excluded.created_at,
         send_count = sms_codes.send_count + 1`,
    )
    .run(phone, hashSmsCode(code), expires, now.toISOString());

  await deliverSmsCode(phone, code);
}

/**
 * 校验验证码；成功则删除记录。
 *
 * @param phone - 手机号
 * @param code - 用户输入
 * @returns 是否通过
 */
export function verifySmsCode(phone: string, code: string): boolean {
  const row = getDb()
    .prepare('SELECT code_hash, expires_at FROM sms_codes WHERE phone = ?')
    .get(phone) as { code_hash: string; expires_at: string } | undefined;
  if (!row) {
    return false;
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    getDb().prepare('DELETE FROM sms_codes WHERE phone = ?').run(phone);
    return false;
  }
  const ok = row.code_hash === hashSmsCode(code.trim());
  if (ok) {
    getDb().prepare('DELETE FROM sms_codes WHERE phone = ?').run(phone);
  }
  return ok;
}
