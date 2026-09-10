import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const cloudDir = path.dirname(fileURLToPath(import.meta.url));
export const CLOUD_ROOT = path.resolve(cloudDir, '..');
export const DATA_DIR = path.join(CLOUD_ROOT, 'data');

let db: Database.Database | null = null;

/**
 * 为已有表补充缺失列（幂等）。
 *
 * @param database - DB
 * @param table - 表名
 * @param column - 列名
 * @param ddl - 列定义片段，如 TEXT
 * @returns {void}
 */
function ensureColumn(
  database: Database.Database,
  table: string,
  column: string,
  ddl: string,
): void {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((item) => item.name === column)) {
    return;
  }
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

/**
 * 获取（并初始化）SQLite 连接。
 *
 * @returns Database 实例
 */
export function getDb(): Database.Database {
  if (db) {
    return db;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dbPath = process.env.CLOUD_DB_PATH || path.join(DATA_DIR, 'cloud.sqlite');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      invite_code TEXT UNIQUE,
      project_limit INTEGER NOT NULL DEFAULT 3,
      invited_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sms_codes (
      phone TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      send_count INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sms_rate (
      key TEXT PRIMARY KEY,
      window_start TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS catalogs (
      user_id TEXT PRIMARY KEY,
      projects_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      user_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, month_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  ensureColumn(db, 'users', 'password_hash', 'TEXT');
  ensureColumn(db, 'users', 'invite_code', 'TEXT');
  ensureColumn(db, 'users', 'project_limit', 'INTEGER NOT NULL DEFAULT 3');
  ensureColumn(db, 'users', 'invited_by', 'TEXT');

  // 为旧用户补个人邀请码与默认额度
  const rows = db
    .prepare('SELECT id FROM users WHERE invite_code IS NULL OR invite_code = ?')
    .all('') as Array<{ id: string }>;
  const updateInvite = db.prepare('UPDATE users SET invite_code = ? WHERE id = ?');
  for (const row of rows) {
    updateInvite.run(generateInviteCodeValue(), row.id);
  }
  db.prepare(
    'UPDATE users SET project_limit = 3 WHERE project_limit IS NULL OR project_limit < 1',
  ).run();

  return db;
}

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
