import { Router } from 'express';
import {
  cloudBillingCatalog,
  cloudBillingCheckout,
  cloudBillingPay,
  cloudBillingSwitchFree,
} from '../cloud-client.js';
import { requireLocalLogin } from '../require-auth.js';

export const billingRouter = Router();

/**
 * GET /api/billing/catalog — 套餐与加油包目录
 */
billingRouter.get('/catalog', async (_req, res, next) => {
  try {
    const data = await cloudBillingCatalog();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/checkout — 创建订单
 */
billingRouter.post('/checkout', requireLocalLogin, async (req, res, next) => {
  try {
    const kind = req.body?.kind === 'ai_pack' ? 'ai_pack' : 'plan';
    const data = await cloudBillingCheckout({
      kind,
      planId: typeof req.body?.planId === 'string' ? req.body.planId : undefined,
      billingCycle: req.body?.billingCycle === 'yearly' ? 'yearly' : 'monthly',
    });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/orders/:id/pay — 支付并开通
 */
billingRouter.post('/orders/:id/pay', requireLocalLogin, async (req, res, next) => {
  try {
    const data = await cloudBillingPay(String(req.params.id));
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/switch-free — 降级到免费版
 */
billingRouter.post('/switch-free', requireLocalLogin, async (_req, res, next) => {
  try {
    const data = await cloudBillingSwitchFree();
    res.json(data);
  } catch (error) {
    next(error);
  }
});
