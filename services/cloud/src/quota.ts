import { getDb } from './db.js';

/**
 * 当前 UTC 月份键 YYYY-MM。
 *
 * @returns 月份键
 */
export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * 读取月配额上限。
 *
 * @returns 次数
 */
export function getMonthlyQuotaLimit(): number {
  const n = Number(process.env.AI_QUOTA_MONTHLY ?? 20);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

/**
 * 查询用户本月已用与剩余。
 *
 * @param userId - 用户 id
 * @returns 配额视图
 */
export function getRemainingAiQuota(userId: string): {
  month: string;
  limit: number;
  used: number;
  remaining: number;
} {
  const month = currentMonthKey();
  const limit = getMonthlyQuotaLimit();
  const row = getDb()
    .prepare('SELECT used FROM ai_usage WHERE user_id = ? AND month_key = ?')
    .get(userId, month) as { used: number } | undefined;
  const used = row?.used ?? 0;
  return {
    month,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

/**
 * 尝试扣减 1 次 AI 配额。
 *
 * @param userId - 用户 id
 * @returns 扣减后配额；不足则 null
 */
export function consumeAiQuota(userId: string): ReturnType<typeof getRemainingAiQuota> | null {
  const month = currentMonthKey();
  const limit = getMonthlyQuotaLimit();
  const database = getDb();
  const tx = database.transaction(() => {
    const row = database
      .prepare('SELECT used FROM ai_usage WHERE user_id = ? AND month_key = ?')
      .get(userId, month) as { used: number } | undefined;
    const used = row?.used ?? 0;
    if (used >= limit) {
      return null;
    }
    if (row) {
      database
        .prepare('UPDATE ai_usage SET used = used + 1 WHERE user_id = ? AND month_key = ?')
        .run(userId, month);
    } else {
      database
        .prepare('INSERT INTO ai_usage (user_id, month_key, used) VALUES (?, ?, 1)')
        .run(userId, month);
    }
    return getRemainingAiQuota(userId);
  });
  return tx();
}
