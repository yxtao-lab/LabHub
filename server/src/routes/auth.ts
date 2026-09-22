import { Router } from 'express';
import {
  clearAuthState,
  getCloudUrl,
  getLabhubRepoUrl,
  getUpgradeOffer,
  loadAuthState,
} from '../auth-store.js';
import {
  cloudChangePassword,
  cloudFetchMe,
  cloudGetCatalog,
  cloudLoginPassword,
  cloudPutCatalog,
  cloudRegister,
  cloudSendSms,
  cloudVerifySms,
} from '../cloud-client.js';
import {
  buildLocalCatalogPayload,
  mergeLocalCatalogWithCloud,
  restoreProjectFromCatalog,
  syncLocalCatalogFromCloud,
} from '../catalog-sync.js';
import { toProjectView } from '../projects-service.js';
import { requireLocalLogin } from '../require-auth.js';
import { loadProjects } from '../store.js';

export const authRouter = Router();

/**
 * GET /api/auth/status — 本机登录态 + Cloud 是否配置
 */
authRouter.get('/status', async (_req, res, next) => {
  try {
    const cloudUrl = getCloudUrl();
    const labhubRepoUrl = getLabhubRepoUrl() || null;
    const upgrade = getUpgradeOffer();
    const local = loadAuthState();
    if (!local || !cloudUrl) {
      res.json({
        cloudUrl: cloudUrl || null,
        labhubRepoUrl,
        loggedIn: false,
        user: null,
        upgrade,
      });
      return;
    }
    try {
      const user = await cloudFetchMe();
      res.json({ cloudUrl, labhubRepoUrl, loggedIn: Boolean(user), user, upgrade });
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        res.json({ cloudUrl, labhubRepoUrl, loggedIn: false, user: null, upgrade });
        return;
      }
      res.json({
        cloudUrl,
        labhubRepoUrl,
        loggedIn: true,
        user: {
          id: local.userId,
          phoneMasked: local.phoneMasked,
          aiQuota: null,
        },
        upgrade,
        warning: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/sms/send
 */
authRouter.post('/sms/send', async (req, res, next) => {
  try {
    await cloudSendSms(String(req.body?.phone ?? ''));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login — 手机号 + 密码
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const phone = String(req.body?.phone ?? '');
    const password = String(req.body?.password ?? '');
    const { user } = await cloudLoginPassword(phone, password);
    const catalog = await cloudGetCatalog();
    const projects = await mergeLocalCatalogWithCloud(catalog);
    res.json({ user, registered: false, projectCount: projects.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/register — 手机号注册
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const phone = String(req.body?.phone ?? '');
    const password = String(req.body?.password ?? '');
    const code = String(req.body?.code ?? '');
    const inviteCode =
      typeof req.body?.inviteCode === 'string' ? req.body.inviteCode : undefined;
    const { user } = await cloudRegister({ phone, password, code, inviteCode });
    const catalog = await cloudGetCatalog();
    const projects = await mergeLocalCatalogWithCloud(catalog);
    res.status(201).json({ user, registered: true, projectCount: projects.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/sms/verify — 已注册用户验证码登录
 */
authRouter.post('/sms/verify', async (req, res, next) => {
  try {
    const phone = String(req.body?.phone ?? '');
    const code = String(req.body?.code ?? '');
    const { user } = await cloudVerifySms(phone, code);
    const catalog = await cloudGetCatalog();
    const projects = await mergeLocalCatalogWithCloud(catalog);
    res.json({ user, registered: false, projectCount: projects.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', (_req, res) => {
  clearAuthState();
  res.json({ ok: true });
});

/**
 * POST /api/auth/password — 修改密码
 */
authRouter.post('/password', requireLocalLogin, async (req, res, next) => {
  try {
    const oldPassword = String(req.body?.oldPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');
    await cloudChangePassword(oldPassword, newPassword);
    res.json({ ok: true, message: '密码已修改' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/sync-catalog — 将本机清单推到云端
 */
authRouter.post('/sync-catalog', requireLocalLogin, async (_req, res, next) => {
  try {
    const saved = await cloudPutCatalog(buildLocalCatalogPayload());
    res.json({ projects: saved.projects, categories: saved.categories });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/pull-catalog — 从云端覆盖本机清单
 */
authRouter.post('/pull-catalog', requireLocalLogin, async (_req, res, next) => {
  try {
    const catalog = await cloudGetCatalog();
    const projects = await syncLocalCatalogFromCloud(catalog);
    res.json({ projects, categories: catalog.categories });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/restore/:id — 按清单重新克隆缺失项目
 * body.targetBaseDir 可选：恢复到该父目录下的 <id>
 */
authRouter.post('/restore/:id', requireLocalLogin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const targetBaseDir =
      typeof req.body?.targetBaseDir === 'string' ? req.body.targetBaseDir.trim() : '';
    const record = await restoreProjectFromCatalog(id, {
      targetBaseDir: targetBaseDir || undefined,
    });
    if (!record) {
      res.status(400).json({ error: '无需恢复' });
      return;
    }
    res.json({ project: await toProjectView(record) });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/restore-missing — 批量恢复本地不存在的项目
 * body.ids 可选：只恢复指定 id；缺省为全部缺失项
 * body.targetBaseDir 可选：恢复父目录
 */
authRouter.post('/restore-missing', requireLocalLogin, async (req, res, next) => {
  try {
    const list = loadProjects();
    const targetBaseDir =
      typeof req.body?.targetBaseDir === 'string' ? req.body.targetBaseDir.trim() : '';
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : null;
    const idSet =
      rawIds == null
        ? null
        : new Set(
            rawIds
              .map((item: unknown) => String(item || '').trim())
              .filter(Boolean),
          );
    const restored: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    for (const item of list) {
      if (idSet && !idSet.has(item.id)) {
        continue;
      }
      try {
        const record = await restoreProjectFromCatalog(item.id, {
          skipIfExists: true,
          targetBaseDir: targetBaseDir || undefined,
        });
        if (record) {
          restored.push(item.id);
        }
      } catch (error) {
        failed.push({
          id: item.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    res.json({ restored, failed });
  } catch (error) {
    next(error);
  }
});
