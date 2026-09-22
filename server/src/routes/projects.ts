import { Router } from 'express';
import { readProjectAnalysis } from '../analysis.js';
import { ensureMissingAnalyses, generateProjectAnalysis } from '../analysis-generate.js';
import { listRemoteBranches } from '../git.js';
import {
  addCustomCommand,
  addCustomCommandSchema,
  addProject,
  addProjectSchema,
  buildProject,
  checkoutBranchForProject,
  clearProjectLogs,
  commitProject,
  deleteCustomCommand,
  deleteProject,
  getProjectLogs,
  installProject,
  listBranchesForProject,
  listProjectViews,
  mergeProjectBranch,
  runCustomCommand,
  runCustomCommandSchema,
  startProject,
  stashPopProject,
  stashProject,
  stopProject,
  syncProfilesFromPackage,
  syncProject,
  toProjectView,
  updateCustomCommand,
  updateCustomCommandSchema,
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
 * GET /api/projects/remote-branches?repoUrl= — 探测远程全部分支
 */
projectsRouter.get('/remote-branches', async (req, res, next) => {
  try {
    const repoUrl = String(req.query.repoUrl ?? '').trim();
    if (!repoUrl) {
      res.status(400).json({ error: '缺少 repoUrl' });
      return;
    }
    const result = await listRemoteBranches(repoUrl);
    res.json(result);
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
 * 查询参数 stream=1 时返回 NDJSON 进度流，最后一行为 done/error。
 */
projectsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = addProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const wantStream =
      req.query.stream === '1' ||
      req.query.stream === 'true' ||
      String(req.headers.accept || '').includes('application/x-ndjson');

    if (!wantStream) {
      const project = await addProject(parsed.data);
      res.status(201).json({ project });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as { flushHeaders?: () => void }).flushHeaders === 'function') {
      (res as { flushHeaders: () => void }).flushHeaders();
    }

    const writeEvent = (payload: unknown) => {
      if (res.writableEnded) {
        return;
      }
      res.write(`${JSON.stringify(payload)}\n`);
    };

    try {
      const project = await addProject(parsed.data, (event) => writeEvent(event));
      writeEvent({ type: 'done', project });
      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as { code?: string }).code;
      const status = (error as { status?: number }).status;
      writeEvent({
        type: 'error',
        error: message,
        ...(typeof code === 'string' ? { code } : {}),
        ...(typeof status === 'number' ? { status } : {}),
      });
      res.end();
    }
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
 * POST /api/projects/:id/run — 在项目目录执行自定义命令
 */
projectsRouter.post('/:id/run', async (req, res, next) => {
  try {
    const parsed = runCustomCommandSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const result = await runCustomCommand(req.params.id, parsed.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/custom-commands — 保存自定义命令
 */
projectsRouter.post('/:id/custom-commands', async (req, res, next) => {
  try {
    const parsed = addCustomCommandSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const result = await addCustomCommand(req.params.id, parsed.data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/projects/:id/custom-commands/:commandId — 更新自定义命令
 */
projectsRouter.patch('/:id/custom-commands/:commandId', async (req, res, next) => {
  try {
    const parsed = updateCustomCommandSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const result = await updateCustomCommand(
      req.params.id,
      req.params.commandId,
      parsed.data,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:id/custom-commands/:commandId — 删除自定义命令
 */
projectsRouter.delete('/:id/custom-commands/:commandId', async (req, res, next) => {
  try {
    const project = await deleteCustomCommand(req.params.id, req.params.commandId);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/sync — git fetch/merge origin（仓库日志）
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
 * POST /api/projects/:id/commit — body.message 提交全部改动
 */
projectsRouter.post('/:id/commit', async (req, res, next) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message : '';
    const project = await commitProject(req.params.id, message);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/stash — body.message 可选
 */
projectsRouter.post('/:id/stash', async (req, res, next) => {
  try {
    const message =
      typeof req.body?.message === 'string' ? req.body.message : undefined;
    const project = await stashProject(req.params.id, message);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/stash-pop — 弹出最近一次 stash
 */
projectsRouter.post('/:id/stash-pop', async (req, res, next) => {
  try {
    const project = await stashPopProject(req.params.id);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/merge — body.branch 合并到当前分支
 */
projectsRouter.post('/:id/merge', async (req, res, next) => {
  try {
    const branch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    if (!branch) {
      res.status(400).json({ error: '缺少 branch' });
      return;
    }
    const project = await mergeProjectBranch(req.params.id, branch);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id/branches — 列出本地 / 远程分支
 */
projectsRouter.get('/:id/branches', async (req, res, next) => {
  try {
    const result = await listBranchesForProject(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/checkout — body.branch 切换分支
 * 查询参数 stream=1 时返回 NDJSON 进度流。
 */
projectsRouter.post('/:id/checkout', async (req, res, next) => {
  try {
    const branch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    if (!branch) {
      res.status(400).json({ error: '缺少 branch' });
      return;
    }
    const wantStream =
      req.query.stream === '1' ||
      req.query.stream === 'true' ||
      String(req.headers.accept || '').includes('application/x-ndjson');

    if (!wantStream) {
      const project = await checkoutBranchForProject(req.params.id, branch);
      res.json({ project });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as { flushHeaders?: () => void }).flushHeaders === 'function') {
      (res as { flushHeaders: () => void }).flushHeaders();
    }

    const writeEvent = (payload: unknown) => {
      if (res.writableEnded) {
        return;
      }
      res.write(`${JSON.stringify(payload)}\n`);
    };

    try {
      const project = await checkoutBranchForProject(req.params.id, branch, (event) =>
        writeEvent(event),
      );
      writeEvent({ type: 'done', project });
      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeEvent({ type: 'error', error: message });
      res.end();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/sync-profiles — 从 package.json 同步启动/构建模式
 */
projectsRouter.post('/:id/sync-profiles', async (req, res, next) => {
  try {
    const project = await syncProfilesFromPackage(req.params.id);
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
