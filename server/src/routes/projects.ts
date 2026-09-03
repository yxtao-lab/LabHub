import { Router } from 'express';
import { readProjectAnalysis } from '../analysis.js';
import { processManager } from '../process-manager.js';
import {
  addProject,
  addProjectSchema,
  deleteProject,
  listProjectViews,
  startProject,
  stopProject,
  syncProject,
  toProjectView,
  updateProject,
  updateProjectSchema,
} from '../projects-service.js';
import { findProject } from '../store.js';

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
 * GET /api/projects/:id/analysis — 项目分析总结 Markdown
 */
projectsRouter.get('/:id/analysis', (req, res, next) => {
  try {
    const record = findProject(req.params.id);
    if (!record) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    const analysis = readProjectAnalysis(record.path);
    res.json({ analysis });
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
 * POST /api/projects/:id/start
 */
projectsRouter.post('/:id/start', async (req, res, next) => {
  try {
    const project = await startProject(req.params.id);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/stop
 */
projectsRouter.post('/:id/stop', async (req, res, next) => {
  try {
    const project = await stopProject(req.params.id);
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
 * GET /api/projects/:id/logs
 */
projectsRouter.get('/:id/logs', (req, res) => {
  const limit = Number(req.query.limit ?? 200);
  res.json({ logs: processManager.getLogs(req.params.id, limit) });
});
