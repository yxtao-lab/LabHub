import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  ensureDevTestUser,
  findUserById,
  loginExistingBySms,
  loginWithPassword,
  registerUser,
  signUserToken,
  toMeView,
  verifyUserToken,
  type AuthUser,
} from './auth.js';
import { catalogBodySchema, getCatalog, putCatalog } from './catalog.js';
import {
  createBillingOrder,
  listBillingCatalog,
  payBillingOrder,
  switchToFreePlan,
} from './billing.js';
import { initDb } from './db.js';
import { generateAnalysisMarkdown } from './deepseek.js';
import { loadRelayEnvFile } from './load-env.js';
import { normalizePhone } from './phone.js';
import { consumeAiQuota, getRemainingAiQuota } from './quota.js';
import { issueSmsCode, verifySmsCode } from './sms.js';

loadRelayEnvFile();

const port = Number(process.env.PORT ?? 8780);
const maxContextChars = Number(process.env.RELAY_MAX_CONTEXT_CHARS ?? 120_000);

type AuthedRequest = Request & { user?: AuthUser };

/**
 * 从请求解析客户端 IP。
 *
 * @param req - Express 请求
 * @returns IP
 */
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * JWT 鉴权中间件。
 *
 * @param req - 请求
 * @param res - 响应
 * @param next - 下一步
 * @returns {Promise<void>}
 */
async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: '未登录' });
      return;
    }
    req.user = await verifyUserToken(header.slice(7).trim());
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(401).json({ error: message });
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '512kb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'labhub-cloud',
    hasDeepSeekKey: Boolean((process.env.DEEPSEEK_API_KEY ?? '').trim()),
    smsProvider: process.env.SMS_PROVIDER || 'dev',
    database: 'postgresql',
  });
});

/**
 * POST /v1/auth/sms/send — 发送验证码（注册或验证码登录）
 */
app.post('/v1/auth/sms/send', async (req, res) => {
  try {
    const phone = normalizePhone(String(req.body?.phone ?? ''));
    await issueSmsCode(phone, clientIp(req));
    res.json({ ok: true, message: '验证码已发送' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});

/**
 * POST /v1/auth/register — 手机号注册（短信验证 + 密码；邀请码可选）
 */
app.post('/v1/auth/register', async (req, res) => {
  try {
    const phone = normalizePhone(String(req.body?.phone ?? ''));
    const password = String(req.body?.password ?? '');
    const code = String(req.body?.code ?? '');
    const inviteCode =
      typeof req.body?.inviteCode === 'string' ? req.body.inviteCode : undefined;
    if (!code.trim()) {
      res.status(400).json({ error: '请输入短信验证码' });
      return;
    }
    if (!(await verifySmsCode(phone, code))) {
      res.status(400).json({ error: '验证码错误或已过期' });
      return;
    }
    const user = await registerUser(phone, password, inviteCode);
    const token = await signUserToken(user);
    res.status(201).json({
      token,
      registered: true,
      user: await toMeView(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});

/**
 * POST /v1/auth/login — 手机号 + 密码登录
 */
app.post('/v1/auth/login', async (req, res) => {
  try {
    const phone = normalizePhone(String(req.body?.phone ?? ''));
    const password = String(req.body?.password ?? '');
    const user = await loginWithPassword(phone, password);
    const token = await signUserToken(user);
    res.json({
      token,
      registered: false,
      user: await toMeView(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});

/**
 * POST /v1/auth/sms/verify — 已注册用户用验证码登录（不自动注册）
 */
app.post('/v1/auth/sms/verify', async (req, res) => {
  try {
    const phone = normalizePhone(String(req.body?.phone ?? ''));
    const code = String(req.body?.code ?? '');
    if (!code.trim()) {
      res.status(400).json({ error: '请输入验证码' });
      return;
    }
    if (!(await verifySmsCode(phone, code))) {
      res.status(400).json({ error: '验证码错误或已过期' });
      return;
    }
    const user = await loginExistingBySms(phone);
    const token = await signUserToken(user);
    res.json({
      token,
      registered: false,
      user: await toMeView(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});

app.get('/v1/auth/me', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const fresh = (await findUserById(req.user!.id)) ?? req.user!;
    res.json({ user: await toMeView(fresh) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.get('/v1/catalog', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = (await findUserById(req.user!.id)) ?? req.user!;
    res.json({
      projects: await getCatalog(req.user!.id),
      projectLimit: user.projectLimit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.put('/v1/catalog', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const parsed = catalogBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const user = (await findUserById(req.user!.id)) ?? req.user!;
    if (parsed.data.projects.length > user.projectLimit) {
      res.status(403).json({
        error: `超出项目管理额度（最多 ${user.projectLimit} 个，当前提交 ${parsed.data.projects.length} 个）`,
        projectLimit: user.projectLimit,
      });
      return;
    }
    const projects = await putCatalog(req.user!.id, parsed.data.projects);
    res.json({ projects, projectLimit: user.projectLimit });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.get('/v1/billing/catalog', (_req, res) => {
  res.json(listBillingCatalog());
});

app.post('/v1/billing/checkout', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const kind = String(req.body?.kind ?? 'plan') as 'plan' | 'ai_pack';
    if (kind !== 'plan' && kind !== 'ai_pack') {
      res.status(400).json({ error: '无效的订单类型' });
      return;
    }
    const result = await createBillingOrder(req.user!.id, {
      kind,
      planId: typeof req.body?.planId === 'string' ? req.body.planId : undefined,
      billingCycle: req.body?.billingCycle === 'yearly' ? 'yearly' : 'monthly',
    });
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});

app.post('/v1/billing/orders/:id/pay', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const paid = await payBillingOrder(req.user!.id, String(req.params.id));
    const fresh = (await findUserById(req.user!.id)) ?? req.user!;
    res.json({
      ...paid,
      user: await toMeView(fresh),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: number }).status;
    res.status(typeof status === 'number' ? status : 400).json({ error: message });
  }
});

app.post('/v1/billing/switch-free', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await switchToFreePlan(req.user!.id);
    const fresh = (await findUserById(req.user!.id)) ?? req.user!;
    res.json({ user: await toMeView(fresh) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});

const analyzeBodySchema = z.object({
  project: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    path: z.string().min(1),
    repoUrl: z.string().optional(),
    branch: z.string().optional(),
    startCommand: z.string().optional(),
    installCommand: z.string().optional(),
    openUrl: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
  context: z.string().min(1).max(maxContextChars),
});

app.post('/v1/analyze', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = analyzeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const quota = await getRemainingAiQuota(req.user!.id);
  if (quota.remaining <= 0) {
    res.status(402).json({
      error: '本月 AI 分析次数已用完',
      aiQuota: quota,
    });
    return;
  }

  try {
    const markdown = await generateAnalysisMarkdown(parsed.data.project, parsed.data.context);
    const after = await consumeAiQuota(req.user!.id);
    res.json({
      markdown,
      source: 'deepseek',
      aiQuota: after ?? (await getRemainingAiQuota(req.user!.id)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[labhub-cloud] analyze', message);
    res.status(502).json({ error: message });
  }
});

/**
 * 启动 Cloud：连库建表后监听端口。
 *
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  await initDb();
  app.listen(port, () => {
    console.log(`[labhub-cloud] http://127.0.0.1:${port}`);
    console.log('[labhub-cloud] DeepSeek / 短信密钥仅驻留本进程；勿提交 .env');
    void (async () => {
      try {
        const testUser = await ensureDevTestUser();
        if (testUser) {
          console.log(
            `[labhub-cloud] 开发测试账号已就绪：${testUser.phone} / ${testUser.password}`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[labhub-cloud] 写入开发测试账号失败：', message);
      }
    })();
  });
}

main().catch((error) => {
  console.error('[labhub-cloud] 启动失败', error);
  process.exit(1);
});
