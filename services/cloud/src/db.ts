import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const cloudDir = path.dirname(fileURLToPath(import.meta.url));
export const CLOUD_ROOT = path.resolve(cloudDir, '..');

let pool: pg.Pool | null = null;

/**
 * 生成个人邀请码。
 *
 * @returns 邀请码
 */
export function generateInviteCodeValue(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'LH';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * 默认项目管理额度。
 *
 * @returns 数量
 */
export function defaultProjectLimit(): number {
  const n = Number(process.env.DEFAULT_PROJECT_LIMIT ?? 3);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

/**
 * 读取 PostgreSQL 连接串。
 *
 * @returns 连接串
 * @throws {Error} 未配置 DATABASE_URL
 */
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      '请配置 DATABASE_URL（例如 postgresql://labhub:labhub@127.0.0.1:5433/labhub）',
    );
  }
  return url;
}

/**
 * 启动时自动建表（幂等）。
 *
 * @param database - 连接池
 * @returns {Promise<void>}
 */
async function ensureSchema(database: pg.Pool): Promise<void> {
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      invite_code TEXT UNIQUE,
      project_limit INTEGER NOT NULL DEFAULT 3,
      invited_by TEXT,
      plan_id TEXT NOT NULL DEFAULT 'free',
      plan_expires_at TIMESTAMPTZ,
      ai_bonus INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sms_codes (
      phone TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      send_count INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sms_rate (
      key TEXT PRIMARY KEY,
      window_start TIMESTAMPTZ NOT NULL,
      count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS catalogs (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      projects_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month_key TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, month_key)
    );

    CREATE TABLE IF NOT EXISTS billing_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      plan_id TEXT,
      billing_cycle TEXT,
      amount_fen INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      paid_at TIMESTAMPTZ
    );
  `);

  await ensureColumn(database, 'users', 'plan_id', "TEXT NOT NULL DEFAULT 'free'");
  await ensureColumn(database, 'users', 'plan_expires_at', 'TIMESTAMPTZ');
  await ensureColumn(database, 'users', 'ai_bonus', 'INTEGER NOT NULL DEFAULT 0');

  const rows = (
    await database.query<{ id: string }>(
      `SELECT id FROM users WHERE invite_code IS NULL OR invite_code = ''`,
    )
  ).rows;
  for (const row of rows) {
    await database.query('UPDATE users SET invite_code = $1 WHERE id = $2', [
      generateInviteCodeValue(),
      row.id,
    ]);
  }
  await database.query(
    'UPDATE users SET project_limit = 3 WHERE project_limit IS NULL OR project_limit < 1',
  );
  await database.query(
    `UPDATE users SET plan_id = 'free' WHERE plan_id IS NULL OR plan_id = ''`,
  );
}

/**
 * 为已有表补充缺失列（幂等）。
 *
 * @param database - 连接池
 * @param table - 表名
 * @param column - 列名
 * @param ddl - 列定义
 * @returns {Promise<void>}
 */
async function ensureColumn(
  database: pg.Pool,
  table: string,
  column: string,
  ddl: string,
): Promise<void> {
  const cols = (
    await database.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    )
  ).rows;
  if (cols.some((item) => item.column_name === column)) {
    return;
  }
  await database.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

/**
 * 初始化 PostgreSQL 连接池并自动建表。
 *
 * @returns 连接池
 */
export async function initDb(): Promise<pg.Pool> {
  if (pool) {
    return pool;
  }
  pool = new Pool({ connectionString: resolveDatabaseUrl() });
  try {
    await ensureSchema(pool);
  } catch (error) {
    await pool.end().catch(() => undefined);
    pool = null;
    throw error;
  }
  return pool;
}

/**
 * 获取已初始化的连接池。
 *
 * @returns 连接池
 * @throws {Error} 尚未 initDb
 */
export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('数据库未初始化，请先调用 initDb()');
  }
  return pool;
}

/**
 * 执行查询。
 *
 * @param text - SQL
 * @param params - 参数（$1 起）
 * @returns 查询结果
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/**
 * 在事务中执行回调。
 *
 * @param fn - 使用同一 client 的异步函数
 * @returns 回调返回值
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
