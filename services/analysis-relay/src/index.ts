import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { generateAnalysisMarkdown } from './deepseek.js';
import { loadRelayEnvFile } from './load-env.js';

loadRelayEnvFile();

const port = Number(process.env.PORT ?? 8780);
const windowMs = Number(process.env.RELAY_RATE_WINDOW_MS ?? 60 * 60 * 1000);
const maxPerWindow = Number(process.env.RELAY_RATE_MAX ?? 8);
const maxContextChars = Number(process.env.RELAY_MAX_CONTEXT_CHARS ?? 120_000);

/** 简易内存限流：ip → 时间戳列表 */
const rateBuckets = new Map<string, number[]>();

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

/**
 * 检查并记录 IP 限流。
 *
 * @param ip - 客户端 IP
 * @returns 是否允许
 */
function allowRequest(ip: string): boolean {
  const now = Date.now();
  const prev = (rateBuckets.get(ip) ?? []).filter((ts) => now - ts < windowMs);
  if (prev.length >= maxPerWindow) {
    rateBuckets.set(ip, prev);
    return false;
  }
  prev.push(now);
  rateBuckets.set(ip, prev);
  return true;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '512kb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'labhub-analysis-relay',
    hasDeepSeekKey: Boolean((process.env.DEEPSEEK_API_KEY ?? '').trim()),
  });
});

/**
 * POST /v1/analyze — LabHub 首次托管时提交证据，返回 Markdown（Key 不出本服务）。
 */
app.post('/v1/analyze', async (req, res) => {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
      : null) ||
    req.socket.remoteAddress ||
    'unknown';

  if (!allowRequest(ip)) {
    res.status(429).json({ error: '分析中继限流：请稍后再试' });
    return;
  }

  const parsed = analyzeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const markdown = await generateAnalysisMarkdown(parsed.data.project, parsed.data.context);
    res.json({ markdown, source: 'deepseek' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[analysis-relay]', message);
    res.status(502).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`[analysis-relay] http://127.0.0.1:${port}`);
  console.log('[analysis-relay] DeepSeek Key 仅驻留本进程；勿提交 .env');
});
