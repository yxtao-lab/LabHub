import crypto from 'node:crypto';
import type pg from 'pg';
import { findUserById, type AuthUser } from './auth.js';
import { query, withTransaction } from './db.js';
import {
  AI_PACK,
  findPlan,
  freePlan,
  PLAN_DEFINITIONS,
  toAiPackView,
  toPlanView,
} from './plans.js';

export type BillingCycle = 'monthly' | 'yearly';
export type OrderKind = 'plan' | 'ai_pack';
export type OrderStatus = 'pending' | 'paid' | 'cancelled';

type OrderRow = {
  id: string;
  user_id: string;
  kind: OrderKind;
  plan_id: string | null;
  billing_cycle: string | null;
  amount_fen: number;
  status: OrderStatus;
  created_at: Date | string;
  paid_at: Date | string | null;
};

type UserPlanRow = {
  id: string;
  plan_id: string | null;
  plan_expires_at: Date | string | null;
  project_limit: number;
  ai_bonus: number;
};

/**
 * 当前支付模式：mock 系统内模拟支付即时开通；live 预留真实支付渠道。
 *
 * @returns mock | live
 */
export function getPaymentMode(): 'mock' | 'live' {
  const mode = (process.env.PAYMENT_MODE || 'mock').trim().toLowerCase();
  return mode === 'live' ? 'live' : 'mock';
}

/**
 * 列出套餐目录（含免费版与加油包）。
 *
 * @returns 目录
 */
export function listBillingCatalog() {
  return {
    paymentMode: getPaymentMode(),
    plans: PLAN_DEFINITIONS.map(toPlanView),
    aiPack: toAiPackView(),
  };
}

/**
 * 读取用户套餐字段。
 *
 * @param userId - 用户 id
 * @returns 行或 null
 */
async function loadUserPlanRow(userId: string): Promise<UserPlanRow | null> {
  const row = (
    await query<UserPlanRow>(
      'SELECT id, plan_id, plan_expires_at, project_limit, ai_bonus FROM users WHERE id = $1',
      [userId],
    )
  ).rows[0];
  return row ?? null;
}

/**
 * 解析用户当前有效套餐（过期则回落免费版权限，但不立刻改库）。
 *
 * @param userId - 用户 id
 * @returns 套餐视图信息
 */
export async function resolveUserPlan(userId: string) {
  const row = await loadUserPlanRow(userId);
  const storedId = row?.plan_id || 'free';
  let plan = findPlan(storedId) ?? freePlan();
  let expired = false;
  if (plan.id !== 'free' && row?.plan_expires_at) {
    const expires = new Date(row.plan_expires_at).getTime();
    if (!Number.isNaN(expires) && expires < Date.now()) {
      expired = true;
      plan = freePlan();
    }
  }
  const baseLimit = plan.projectLimit;
  const inviteBonus = Math.max(0, (row?.project_limit ?? baseLimit) - (findPlan(storedId)?.projectLimit ?? baseLimit));
  // 若已过期，展示免费档额度 + 仍保留的邀请加成（用当前 project_limit 与免费档差估算）
  const effectiveProjectLimit = expired
    ? Math.max(freePlan().projectLimit, row?.project_limit ?? freePlan().projectLimit)
    : (row?.project_limit ?? plan.projectLimit);

  return {
    planId: expired ? 'free' : plan.id,
    planName: expired ? freePlan().name : plan.name,
    planExpiresAt: row?.plan_expires_at
      ? new Date(row.plan_expires_at).toISOString()
      : null,
    expired,
    storedPlanId: storedId,
    projectLimit: effectiveProjectLimit,
    aiMonthly: plan.aiMonthly,
    aiBonus: row?.ai_bonus ?? 0,
    inviteBonus,
    plan: toPlanView(plan),
  };
}

/**
 * 套餐对应的月 AI 上限（不含加油包）。
 *
 * @param userId - 用户 id
 * @returns 次数
 */
export async function getUserAiMonthlyLimit(userId: string): Promise<number> {
  const resolved = await resolveUserPlan(userId);
  return resolved.aiMonthly;
}

/**
 * 用户 AI 总上限 = 套餐月配额 + 加油包余额。
 *
 * @param userId - 用户 id
 * @returns 上限
 */
export async function getUserAiTotalLimit(userId: string): Promise<number> {
  const resolved = await resolveUserPlan(userId);
  return resolved.aiMonthly + resolved.aiBonus;
}

/**
 * 订单对外视图。
 *
 * @param row - 订单行
 * @returns 视图
 */
function toOrderView(row: OrderRow) {
  return {
    id: row.id,
    kind: row.kind,
    planId: row.plan_id,
    billingCycle: row.billing_cycle,
    amountFen: row.amount_fen,
    amount: Math.round(row.amount_fen) / 100,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
  };
}

/**
 * 创建待支付订单。
 *
 * @param userId - 用户
 * @param input - 下单参数
 * @returns 订单
 */
export async function createBillingOrder(
  userId: string,
  input: {
    kind: OrderKind;
    planId?: string;
    billingCycle?: BillingCycle;
  },
) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  let amountFen = 0;
  let planId: string | null = null;
  let billingCycle: BillingCycle | null = null;

  if (input.kind === 'ai_pack') {
    amountFen = AI_PACK.priceFen;
  } else {
    const target = findPlan(String(input.planId ?? ''));
    if (!target || target.id === 'free') {
      throw new Error('请选择有效的付费套餐');
    }
    const cycle: BillingCycle = input.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    amountFen = cycle === 'yearly' ? target.priceYearlyFen : target.priceMonthlyFen;
    if (amountFen <= 0) {
      throw new Error('该套餐无需支付');
    }
    planId = target.id;
    billingCycle = cycle;

    const current = await resolveUserPlan(userId);
    if (current.planId === target.id && !current.expired) {
      // 允许续费；同档续费延长有效期
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO billing_orders
     (id, user_id, kind, plan_id, billing_cycle, amount_fen, status, created_at, paid_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NULL)`,
    [id, userId, input.kind, planId, billingCycle, amountFen, now],
  );

  const row = (
    await query<OrderRow>('SELECT * FROM billing_orders WHERE id = $1', [id])
  ).rows[0]!;

  return {
    order: toOrderView(row),
    paymentMode: getPaymentMode(),
    canPayInApp: getPaymentMode() === 'mock',
  };
}

/**
 * 应用套餐到用户（保留邀请带来的超额项目位）。
 *
 * @param client - 事务客户端
 * @param userId - 用户
 * @param planId - 套餐
 * @param cycle - 周期
 * @returns {Promise<void>}
 */
async function applyPlanToUser(
  client: pg.PoolClient,
  userId: string,
  planId: string,
  cycle: BillingCycle,
): Promise<void> {
  const plan = findPlan(planId);
  if (!plan) {
    throw new Error('套餐不存在');
  }
  const row = (
    await client.query<UserPlanRow>(
      'SELECT id, plan_id, plan_expires_at, project_limit, ai_bonus FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    )
  ).rows[0];
  if (!row) {
    throw new Error('用户不存在');
  }

  const oldPlan = findPlan(row.plan_id || 'free') ?? freePlan();
  const inviteBonus = Math.max(0, row.project_limit - oldPlan.projectLimit);
  const nextLimit = plan.projectLimit + inviteBonus;

  let expires: string | null = null;
  if (plan.id !== 'free') {
    const base =
      row.plan_id === plan.id && row.plan_expires_at && new Date(row.plan_expires_at).getTime() > Date.now()
        ? new Date(row.plan_expires_at)
        : new Date();
    if (cycle === 'yearly') {
      base.setFullYear(base.getFullYear() + 1);
    } else {
      base.setMonth(base.getMonth() + 1);
    }
    expires = base.toISOString();
  }

  await client.query(
    `UPDATE users
     SET plan_id = $1, plan_expires_at = $2, project_limit = $3, updated_at = $4
     WHERE id = $5`,
    [plan.id, expires, nextLimit, new Date().toISOString(), userId],
  );
}

/**
 * 支付并开通订单（mock 模式即时完成；live 模式暂未接入渠道）。
 *
 * @param userId - 用户
 * @param orderId - 订单 id
 * @returns 支付结果与最新用户
 */
export async function payBillingOrder(userId: string, orderId: string) {
  if (getPaymentMode() === 'live') {
    throw Object.assign(new Error('正式支付渠道尚未接入，请将 PAYMENT_MODE=mock 或稍后升级'), {
      status: 501,
    });
  }

  const result = await withTransaction(async (client) => {
    const order = (
      await client.query<OrderRow>(
        'SELECT * FROM billing_orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [orderId, userId],
      )
    ).rows[0];
    if (!order) {
      throw new Error('订单不存在');
    }
    if (order.status === 'paid') {
      return order;
    }
    if (order.status !== 'pending') {
      throw new Error('订单状态不可支付');
    }

    const paidAt = new Date().toISOString();
    if (order.kind === 'plan') {
      if (!order.plan_id || !order.billing_cycle) {
        throw new Error('订单套餐信息缺失');
      }
      await applyPlanToUser(
        client,
        userId,
        order.plan_id,
        order.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
      );
    } else if (order.kind === 'ai_pack') {
      await client.query(
        'UPDATE users SET ai_bonus = ai_bonus + $1, updated_at = $2 WHERE id = $3',
        [AI_PACK.quota, paidAt, userId],
      );
    } else {
      throw new Error('未知订单类型');
    }

    await client.query(
      `UPDATE billing_orders SET status = 'paid', paid_at = $1 WHERE id = $2`,
      [paidAt, orderId],
    );

    const fresh = (
      await client.query<OrderRow>('SELECT * FROM billing_orders WHERE id = $1', [orderId])
    ).rows[0]!;
    return fresh;
  });

  return {
    order: toOrderView(result),
    paymentMode: getPaymentMode(),
  };
}

/**
 * 切换到免费版（立即生效；不退款，仅权限降级）。
 *
 * @param userId - 用户
 * @returns {Promise<void>}
 */
export async function switchToFreePlan(userId: string): Promise<void> {
  await withTransaction(async (client) => {
    const row = (
      await client.query<UserPlanRow>(
        'SELECT id, plan_id, plan_expires_at, project_limit, ai_bonus FROM users WHERE id = $1 FOR UPDATE',
        [userId],
      )
    ).rows[0];
    if (!row) {
      throw new Error('用户不存在');
    }
    const oldPlan = findPlan(row.plan_id || 'free') ?? freePlan();
    const inviteBonus = Math.max(0, row.project_limit - oldPlan.projectLimit);
    const nextLimit = freePlan().projectLimit + inviteBonus;
    await client.query(
      `UPDATE users
       SET plan_id = 'free', plan_expires_at = NULL, project_limit = $1, updated_at = $2
       WHERE id = $3`,
      [nextLimit, new Date().toISOString(), userId],
    );
  });
}

/**
 * 供 AuthUser 组装时读取有效项目上限（会顺带纠正过期套餐展示用的 plan，不强制写库）。
 *
 * @param user - 基础用户
 * @returns 含套餐的扩展信息
 */
export async function enrichUserBilling(user: AuthUser) {
  const resolved = await resolveUserPlan(user.id);
  return {
    ...user,
    projectLimit: resolved.projectLimit,
    planId: resolved.planId,
    planName: resolved.planName,
    planExpiresAt: resolved.planExpiresAt,
    aiMonthly: resolved.aiMonthly,
    aiBonus: resolved.aiBonus,
  };
}
