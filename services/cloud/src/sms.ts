import crypto from 'node:crypto';
import { query } from './db.js';

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
async function hitRateLimit(key: string, windowMs: number, max: number): Promise<boolean> {
  const now = Date.now();
  const row = (
    await query<{ window_start: Date | string; count: number }>(
      'SELECT window_start, count FROM sms_rate WHERE key = $1',
      [key],
    )
  ).rows[0];
  if (!row) {
    await query('INSERT INTO sms_rate (key, window_start, count) VALUES ($1, $2, 1)', [
      key,
      new Date(now).toISOString(),
    ]);
    return true;
  }
  const start = new Date(row.window_start).getTime();
  if (Number.isNaN(start) || now - start >= windowMs) {
    await query('UPDATE sms_rate SET window_start = $1, count = 1 WHERE key = $2', [
      new Date(now).toISOString(),
      key,
    ]);
    return true;
  }
  if (row.count >= max) {
    return false;
  }
  await query('UPDATE sms_rate SET count = count + 1 WHERE key = $1', [key]);
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
  if (!(await hitRateLimit(`phone:${phone}`, PHONE_WINDOW_MS, PHONE_MAX_PER_WINDOW))) {
    throw new Error('发送过于频繁，请稍后再试');
  }
  if (!(await hitRateLimit(`ip:${ip}`, IP_WINDOW_MS, IP_MAX_PER_WINDOW))) {
    throw new Error('当前网络发送次数过多，请稍后再试');
  }

  const code =
    process.env.SMS_DEV_CODE?.trim() &&
    (process.env.SMS_PROVIDER || 'dev').toLowerCase() === 'dev'
      ? process.env.SMS_DEV_CODE.trim()
      : generateSmsCode();

  const now = new Date();
  const expires = new Date(now.getTime() + CODE_TTL_MS).toISOString();
  await query(
    `INSERT INTO sms_codes (phone, code_hash, expires_at, created_at, send_count)
     VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (phone) DO UPDATE SET
       code_hash = EXCLUDED.code_hash,
       expires_at = EXCLUDED.expires_at,
       created_at = EXCLUDED.created_at,
       send_count = sms_codes.send_count + 1`,
    [phone, hashSmsCode(code), expires, now.toISOString()],
  );

  await deliverSmsCode(phone, code);
}

/**
 * 校验验证码；成功则删除记录。
 *
 * @param phone - 手机号
 * @param code - 用户输入
 * @returns 是否通过
 */
export async function verifySmsCode(phone: string, code: string): Promise<boolean> {
  const row = (
    await query<{ code_hash: string; expires_at: Date | string }>(
      'SELECT code_hash, expires_at FROM sms_codes WHERE phone = $1',
      [phone],
    )
  ).rows[0];
  if (!row) {
    return false;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query('DELETE FROM sms_codes WHERE phone = $1', [phone]);
    return false;
  }
  const ok = row.code_hash === hashSmsCode(code.trim());
  if (ok) {
    await query('DELETE FROM sms_codes WHERE phone = $1', [phone]);
  }
  return ok;
}
