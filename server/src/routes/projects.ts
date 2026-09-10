import { Router } from 'express';
import { readProjectAnalysis } from '../analysis.js';
import { ensureMissingAnalyses, generateProjectAnalysis } from '../analysis-generate.js';
import {
  addProject,
  addProjectSchema,
  buildProject,
  clearProjectLogs,
  deleteProject,
  getProjectLogs,
  installProject,
  listProjectViews,
  startProject,
  stopProject,
  syncProject,
  toProjectView,
  updateProject,
  updateProjectSchema,
} from '../projects-service.js';
import { findProject, loadProjects } from '../store.js';

export const projectsRouter = Router();

/**
 * GET /api/projects — 列表（含运行态）
 */
projectsRouter.get('/', async (_req, res, next) => {
  try {
    const projects = await listProjectViews();
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/analysis/ensure-missing — 批量为缺失项目生成分析
 */
projectsRouter.post('/analysis/ensure-missing', (_req, res, next) => {
  try {
    const generatedIds = ensureMissingAnalyses(loadProjects());
    res.json({ generatedIds });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id/analysis — 项目分析总结 Markdown
 * 若缺失则用本地启发式补全（不调用 DeepSeek；AI 仅在首次托管时触发）。
 */
projectsRouter.get('/:id/analysis', (req, res, next) => {
  try {
    const record = findProject(req.params.id);
    if (!record) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    let analysis = readProjectAnalysis(record.path);
    let generated = false;
    if (!analysis.exists) {
      analysis = generateProjectAnalysis(record, { force: false });
      generated = true;
    }
    res.json({ analysis, generated });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/analysis/generate — 强制本地启发式重生成（非 DeepSeek）
 */
projectsRouter.post('/:id/analysis/generate', (req, res, next) => {
  try {
    const record = findProject(req.params.id);
    if (!record) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    const analysis = generateProjectAnalysis(record, { force: true });
    res.json({ analysis, generated: true, source: 'heuristic' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id
 */
projectsRouter.get('/:id', async (req, res, next) => {
  try {
    const record = findProject(req.params.id);
    if (!record) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    res.json({ project: await toProjectView(record) });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects — 提供 GitHub 地址登记并克隆
 */
projectsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = addProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const project = await addProject(parsed.data);
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/projects/:id
 */
projectsRouter.patch('/:id', async (req, res, next) => {
  try {
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const project = await updateProject(req.params.id, parsed.data);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:id?deleteFiles=1
 */
projectsRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleteFiles = req.query.deleteFiles === '1' || req.query.deleteFiles === 'true';
    await deleteProject(req.params.id, deleteFiles);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/start — body.profileId 可选
 */
projectsRouter.post('/:id/start', async (req, res, next) => {
  try {
    const profileId =
      typeof req.body?.profileId === 'string' ? req.body.profileId : null;
    const project = await startProject(req.params.id, profileId);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/stop — body.profileId 可选；空则停全部
 */
projectsRouter.post('/:id/stop', async (req, res, next) => {
  try {
    const profileId =
      typeof req.body?.profileId === 'string' ? req.body.profileId : null;
    const project = await stopProject(req.params.id, profileId);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/install — 执行 installCommand
 */
projectsRouter.post('/:id/install', async (req, res, next) => {
  try {
    const project = await installProject(req.params.id);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/build — body.profileId 可选，对应 buildProfiles
 */
projectsRouter.post('/:id/build', async (req, res, next) => {
  try {
    const profileId =
      typeof req.body?.profileId === 'string' ? req.body.profileId : null;
    const project = await buildProject(req.params.id, profileId);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/sync — git fetch/merge origin
 */
projectsRouter.post('/:id/sync', async (req, res, next) => {
  try {
    const project = await syncProject(req.params.id);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id/logs?profileId=&limit=
 */
projectsRouter.get('/:id/logs', (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 200);
    const profileId =
      typeof req.query.profileId === 'string' ? req.query.profileId : null;
    res.json({ logs: getProjectLogs(req.params.id, profileId, limit) });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:id/logs?profileId=
 * 清空日志缓冲；未传 profileId 时清空该项目全部模式/构建/安装日志。
 */
projectsRouter.delete('/:id/logs', (req, res, next) => {
  try {
    const profileId =
      typeof req.query.profileId === 'string' ? req.query.profileId : null;
    clearProjectLogs(req.params.id, profileId);
    res.json({ ok: true, logs: [] });
  } catch (error) {
    next(error);
  }
});
