import { getUserAiTotalLimit } from './billing.js';
import { query, withTransaction } from './db.js';

/**
 * 当前 UTC 月份键 YYYY-MM。
 *
 * @returns 月份键
 */
export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * 环境变量默认月配额（无用户套餐时兜底）。
 *
 * @returns 次数
 */
export function getMonthlyQuotaLimitFallback(): number {
  const n = Number(process.env.AI_QUOTA_MONTHLY ?? 5);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

/**
 * 查询用户本月已用与剩余。
 *
 * @param userId - 用户 id
 * @returns 配额视图
 */
export async function getRemainingAiQuota(userId: string): Promise<{
  month: string;
  limit: number;
  used: number;
  remaining: number;
}> {
  const month = currentMonthKey();
  const limit = await getUserAiTotalLimit(userId);
  const row = (
    await query<{ used: number }>(
      'SELECT used FROM ai_usage WHERE user_id = $1 AND month_key = $2',
      [userId, month],
    )
  ).rows[0];
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
export async function consumeAiQuota(
  userId: string,
): Promise<Awaited<ReturnType<typeof getRemainingAiQuota>> | null> {
  const month = currentMonthKey();
  const limit = await getUserAiTotalLimit(userId);

  return withTransaction(async (client) => {
    const row = (
      await client.query<{ used: number }>(
        'SELECT used FROM ai_usage WHERE user_id = $1 AND month_key = $2 FOR UPDATE',
        [userId, month],
      )
    ).rows[0];
    const used = row?.used ?? 0;
    if (used >= limit) {
      return null;
    }
    if (row) {
      await client.query(
        'UPDATE ai_usage SET used = used + 1 WHERE user_id = $1 AND month_key = $2',
        [userId, month],
      );
    } else {
      await client.query(
        'INSERT INTO ai_usage (user_id, month_key, used) VALUES ($1, $2, 1)',
        [userId, month],
      );
    }
    return getRemainingAiQuota(userId);
  });
}
