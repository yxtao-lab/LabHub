import { Router } from 'express';
import { PROJECTS_DIR } from '../store.js';
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
 * GET /api/workspace/projects-dir — 默认托管目录（恢复缺失的默认父路径）
 */
workspaceRouter.get('/projects-dir', (_req, res) => {
  res.json({ projectsDir: PROJECTS_DIR });
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
