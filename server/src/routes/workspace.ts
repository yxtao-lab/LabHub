import { Router } from 'express';
import { migrateDataDirectory } from '../data-dir-migrate.js';
import { INSTALL_DIR, PROJECTS_DIR, ROOT_DIR } from '../store.js';
import {
  getWorkspaceFilePath,
  openCursorWorkspace,
  syncCursorWorkspaceFile,
} from '../workspace-sync.js';

export const workspaceRouter = Router();

/**
 * POST /api/workspace/sync — 按清单重写 labhub.code-workspace
 */
workspaceRouter.post('/sync', (_req, res, next) => {
  try {
    const workspacePath = syncCursorWorkspaceFile();
    res.json({ workspacePath, fileName: 'labhub.code-workspace' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspace/open — 同步并调用 Cursor CLI 打开多根工作区
 */
workspaceRouter.post('/open', (_req, res, next) => {
  try {
    const result = openCursorWorkspace();
    res.json({
      ok: true,
      ...result,
      hint: '请确认 Cursor 已切换到 labhub.code-workspace；源代码管理应出现全部托管仓（含新项目）',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspace/projects-dir — 默认托管目录与安装目录
 */
workspaceRouter.get('/projects-dir', (_req, res) => {
  res.json({
    projectsDir: PROJECTS_DIR,
    installDir: INSTALL_DIR,
    dataDir: ROOT_DIR,
    locked: process.env.LABHUB_LOCK_DATA_DIR === '1' || process.env.LABHUB_PACKAGED === '1',
  });
});

/**
 * POST /api/workspace/migrate-data-dir — body.targetDir 迁移数据目录
 */
workspaceRouter.post('/migrate-data-dir', async (req, res, next) => {
  try {
    const targetDir =
      typeof req.body?.targetDir === 'string' ? req.body.targetDir.trim() : '';
    if (!targetDir) {
      res.status(400).json({ error: '缺少 targetDir' });
      return;
    }
    const result = await migrateDataDirectory(targetDir);
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspace — 当前工作区文件信息
 */
workspaceRouter.get('/', (_req, res) => {
  res.json({
    workspacePath: getWorkspaceFilePath(),
    fileName: 'labhub.code-workspace',
  });
});
