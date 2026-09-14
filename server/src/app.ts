import path from 'node:path';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { requireLocalLogin } from './require-auth.js';
import { authRouter } from './routes/auth.js';
import { billingRouter } from './routes/billing.js';
import { categoriesRouter } from './routes/categories.js';
import { projectsRouter } from './routes/projects.js';
import { workspaceRouter } from './routes/workspace.js';
import { ROOT_DIR } from './store.js';

/**
 * 创建 Express 应用：API + 生产态静态控制台。
 *
 * @returns Express 实例
 */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'labhub', root: ROOT_DIR });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/categories', requireLocalLogin, categoriesRouter);
  app.use('/api/projects', requireLocalLogin, projectsRouter);
  app.use('/api/workspace', requireLocalLogin, workspaceRouter);

  const clientDist = path.join(ROOT_DIR, 'client', 'dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next();
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[labhub]', message);
    const status = (error as { status?: number }).status;
    const code = (error as { code?: string }).code;
    res.status(typeof status === 'number' && status >= 400 ? status : 400).json({
      error: message,
      ...(typeof code === 'string' && code ? { code } : {}),
    });
  };
  app.use(errorHandler);

  return app;
}
