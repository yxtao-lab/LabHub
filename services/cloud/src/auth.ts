import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type pg from 'pg';
import {
  defaultProjectLimit,
  generateInviteCodeValue,
  query,
  withTransaction,
} from './db.js';
import { maskPhone } from './phone.js';
import { getRemainingAiQuota } from './quota.js';
import { getCatalog } from './catalog.js';
import { resolveUserPlan } from './billing.js';

export type AuthUser = {
  id: string;
  phone: string;
  inviteCode: string;
  projectLimit: number;
};

type UserRow = {
  id: string;
  phone: string;
  password_hash: string | null;
  invite_code: string | null;
  project_limit: number;
  invited_by: string | null;
};

const USER_SELECT =
  'SELECT id, phone, password_hash, invite_code, project_limit, invited_by FROM users';

/**
 * 读取 JWT 密钥。
 *
 * @returns Uint8Array
 */
function jwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error('请配置足够长度的 JWT_SECRET（至少 16 字符）');
  }
  return new TextEncoder().encode(secret);
}

/**
 * 使用 scrypt 哈希密码。
 *
 * @param password - 明文密码
 * @returns 存储串 salt:hash
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * 校验密码。
 *
 * @param password - 明文
 * @param stored - 库中哈希
 * @returns 是否匹配
 */
export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored || !stored.includes(':')) {
    return false;
  }
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) {
    return false;
  }
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

/**
 * 将行映射为 AuthUser。
 *
 * @param row - 数据库行
 * @returns AuthUser
 */
function rowToUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    phone: row.phone,
    inviteCode: row.invite_code || '',
    projectLimit: row.project_limit || defaultProjectLimit(),
  };
}

/**
 * 签发用户 JWT。
 *
 * @param user - 用户
 * @returns token
 */
export async function signUserToken(user: AuthUser): Promise<string> {
  return new SignJWT({ phone: user.phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES || '30d')
    .sign(jwtSecretKey());
}

/**
 * 校验 JWT。
 *
 * @param token - Bearer token
 * @returns 用户
 */
export async function verifyUserToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, jwtSecretKey());
  const id = payload.sub;
  if (!id) {
    throw new Error('无效登录态');
  }
  const user = await findUserById(id);
  if (!user) {
    throw new Error('用户不存在或已失效');
  }
  return user;
}

/**
 * 按 id 查找用户。
 *
 * @param id - 用户 id
 * @returns 用户或 null
 */
export async function findUserById(id: string): Promise<AuthUser | null> {
  const row = (await query<UserRow>(`${USER_SELECT} WHERE id = $1`, [id])).rows[0];
  return row ? rowToUser(row) : null;
}

/**
 * 按手机号查找用户。
 *
 * @param phone - 手机号
 * @returns 用户或 null
 */
export async function findUserByPhone(phone: string): Promise<AuthUser | null> {
  const row = (await query<UserRow>(`${USER_SELECT} WHERE phone = $1`, [phone])).rows[0];
  return row ? rowToUser(row) : null;
}

/**
 * 按个人邀请码查找用户。
 *
 * @param inviteCode - 邀请码
 * @returns 用户或 null
 */
export async function findUserByInviteCode(inviteCode: string): Promise<AuthUser | null> {
  const code = inviteCode.trim().toUpperCase();
  if (!code) {
    return null;
  }
  const row = (
    await query<UserRow>(`${USER_SELECT} WHERE upper(invite_code) = $1`, [code])
  ).rows[0];
  return row ? rowToUser(row) : null;
}

/**
 * 生成不冲突的个人邀请码。
 *
 * @param client - 可选事务客户端
 * @returns 邀请码
 */
async function allocateInviteCode(client?: pg.PoolClient): Promise<string> {
  const run = async (text: string, params: unknown[]) =>
    client ? client.query(text, params) : query(text, params);

  for (let i = 0; i < 20; i += 1) {
    const code = generateInviteCodeValue();
    const exists = await run('SELECT 1 FROM users WHERE invite_code = $1', [code]);
    if (exists.rowCount === 0) {
      return code;
    }
  }
  return `${generateInviteCodeValue()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

/**
 * 校验密码强度（最少 6 位）。
 *
 * @param password - 密码
 * @returns {void}
 * @throws {Error} 不合规
 */
export function assertPassword(password: string): void {
  if (!password || password.length < 6) {
    throw new Error('密码至少 6 位');
  }
}

/**
 * 手机号注册（须已通过短信校验）；可选填写他人邀请码，双方项目管理额度各 +1。
 *
 * @param phone - 手机号
 * @param password - 密码
 * @param inviteCode - 可选邀请码
 * @returns 新用户
 */
export async function registerUser(
  phone: string,
  password: string,
  inviteCode?: string,
): Promise<AuthUser> {
  if (await findUserByPhone(phone)) {
    throw new Error('该手机号已注册，请直接登录');
  }
  assertPassword(password);

  const submitted = (inviteCode ?? '').trim();
  let inviter: AuthUser | null = null;
  if (submitted) {
    inviter = await findUserByInviteCode(submitted);
    if (!inviter) {
      throw new Error('邀请码无效');
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const baseLimit = defaultProjectLimit();
  const projectLimit = inviter ? baseLimit + 1 : baseLimit;

  await withTransaction(async (client) => {
    const myInvite = await allocateInviteCode(client);
    await client.query(
      `INSERT INTO users
       (id, phone, password_hash, invite_code, project_limit, invited_by, plan_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'free', $7, $8)`,
      [
        id,
        phone,
        hashPassword(password),
        myInvite,
        projectLimit,
        inviter?.id ?? null,
        now,
        now,
      ],
    );
    await client.query(
      'INSERT INTO catalogs (user_id, projects_json, updated_at) VALUES ($1, $2::jsonb, $3)',
      [id, '[]', now],
    );
    if (inviter) {
      await client.query(
        'UPDATE users SET project_limit = project_limit + 1, updated_at = $1 WHERE id = $2',
        [now, inviter.id],
      );
    }
  });

  return (await findUserById(id))!;
}

/**
 * 开发环境确保存在可密码登录的测试账号（幂等）。
 * 仅当 SMS_PROVIDER=dev 或显式 SEED_DEV_USER=1 时生效。
 *
 * @returns 测试账号手机号与密码；未启用时返回 null
 */
export async function ensureDevTestUser(): Promise<{ phone: string; password: string } | null> {
  const seedFlag = (process.env.SEED_DEV_USER ?? '').trim() === '1';
  const isDevSms = (process.env.SMS_PROVIDER || 'dev').trim() === 'dev';
  if (!seedFlag && !isDevSms) {
    return null;
  }

  const phone = (process.env.DEV_TEST_PHONE ?? '13800138000').trim();
  const password = (process.env.DEV_TEST_PASSWORD ?? 'labhub123').trim();
  assertPassword(password);

  const existing = (
    await query<UserRow>(`${USER_SELECT} WHERE phone = $1`, [phone])
  ).rows[0];

  if (existing) {
    if (!existing.password_hash || !verifyPassword(password, existing.password_hash)) {
      await setUserPassword(existing.id, password);
    }
    return { phone, password };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await withTransaction(async (client) => {
    const myInvite = await allocateInviteCode(client);
    await client.query(
      `INSERT INTO users
       (id, phone, password_hash, invite_code, project_limit, invited_by, plan_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'free', $7, $8)`,
      [id, phone, hashPassword(password), myInvite, defaultProjectLimit(), null, now, now],
    );
    await client.query(
      'INSERT INTO catalogs (user_id, projects_json, updated_at) VALUES ($1, $2::jsonb, $3)',
      [id, '[]', now],
    );
  });

  return { phone, password };
}

/**
 * 手机号 + 密码登录。
 *
 * @param phone - 手机号
 * @param password - 密码
 * @returns 用户
 */
export async function loginWithPassword(phone: string, password: string): Promise<AuthUser> {
  const row = (await query<UserRow>(`${USER_SELECT} WHERE phone = $1`, [phone])).rows[0];
  if (!row) {
    throw new Error('手机号或密码错误');
  }
  if (!row.password_hash) {
    throw new Error('该账号尚未设置密码，请使用验证码登录后在设置中补全，或重新注册');
  }
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error('手机号或密码错误');
  }
  return rowToUser(row);
}

/**
 * 验证码登录：仅已注册用户；未注册请走注册接口。
 *
 * @param phone - 手机号
 * @returns 用户
 */
export async function loginExistingBySms(phone: string): Promise<AuthUser> {
  const user = await findUserByPhone(phone);
  if (!user) {
    throw new Error('该手机号尚未注册，请先注册');
  }
  return user;
}

/**
 * 为旧短信登录用户补设密码（可选扩展）；此处供注册外场景预留。
 *
 * @param userId - 用户 id
 * @param password - 新密码
 * @returns {Promise<void>}
 */
export async function setUserPassword(userId: string, password: string): Promise<void> {
  assertPassword(password);
  await query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [
    hashPassword(password),
    new Date().toISOString(),
    userId,
  ]);
}

/**
 * 组装 /me 响应。
 *
 * @param user - 用户
 * @returns me 视图
 */
export async function toMeView(user: AuthUser) {
  const resolved = await resolveUserPlan(user.id);
  const quota = await getRemainingAiQuota(user.id);
  const projects = await getCatalog(user.id);
  return {
    id: user.id,
    phoneMasked: maskPhone(user.phone),
    inviteCode: user.inviteCode,
    projectLimit: resolved.projectLimit,
    projectCount: projects.length,
    projectRemaining: Math.max(0, resolved.projectLimit - projects.length),
    planId: resolved.planId,
    planName: resolved.planName,
    planExpiresAt: resolved.planExpiresAt,
    plan: resolved.plan,
    aiBonus: resolved.aiBonus,
    aiQuota: quota,
  };
}
