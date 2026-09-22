import fs from 'node:fs';
import path from 'node:path';
import type { CatalogCategory, CatalogPayload, CatalogProject } from './cloud-client.js';
import { toCatalogProject, cloudPutCatalog } from './cloud-client.js';
import { getAuthToken } from './auth-store.js';
import { cloneRepository } from './git.js';
import { normalizeProjectRecord } from './profiles.js';
import { refreshRecordProfiles } from './package-profiles.js';
import {
  loadCategories,
  loadProjects,
  PROJECTS_DIR,
  ROOT_DIR,
  resolveProjectPath,
  saveStore,
  upsertProject,
  findProject,
} from './store.js';
import { toProjectView } from './projects-service.js';
import type { CategoryRecord, ProjectRecord, ProjectView } from './types.js';
import { syncCursorWorkspaceFile } from './workspace-sync.js';

/**
 * 规范化云端分类项为本机记录。
 *
 * @param item - 云端分类
 * @param index - 缺省排序
 * @returns 本机分类
 */
function toLocalCategory(item: CatalogCategory, index: number): CategoryRecord {
  const now = new Date().toISOString();
  return {
    id: item.id,
    name: item.name,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

/**
 * 比较两条记录的更新时间，取较新者。
 *
 * @param left - 左侧
 * @param right - 右侧
 * @returns 较新的一侧；时间相同则偏右侧（云端）
 */
function pickNewerByUpdatedAt<T extends { updatedAt?: string }>(left: T, right: T): T {
  const leftMs = Date.parse(left.updatedAt || '') || 0;
  const rightMs = Date.parse(right.updatedAt || '') || 0;
  return rightMs >= leftMs ? right : left;
}

/**
 * 合并本机与云端清单：按 id 并集，同 id 取 updatedAt 较新的一侧。
 * 避免「Cloud 宕机时本地新增未能推送，登录后被旧云端清单整表覆盖」。
 *
 * @param local - 本机当前清单
 * @param cloud - 云端清单
 * @returns 合并后的云端形态载荷
 */
export function mergeCatalogPayloads(
  local: CatalogPayload,
  cloud: CatalogPayload,
): CatalogPayload {
  const categoryMap = new Map<string, CatalogCategory>();
  for (const item of local.categories ?? []) {
    categoryMap.set(item.id, item);
  }
  for (const item of cloud.categories ?? []) {
    const prev = categoryMap.get(item.id);
    categoryMap.set(item.id, prev ? pickNewerByUpdatedAt(prev, item) : item);
  }

  const projectMap = new Map<string, CatalogProject>();
  for (const item of local.projects ?? []) {
    projectMap.set(item.id, item);
  }
  for (const item of cloud.projects ?? []) {
    const prev = projectMap.get(item.id);
    projectMap.set(item.id, prev ? pickNewerByUpdatedAt(prev, item) : item);
  }

  const categories = [...categoryMap.values()].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const categoryIds = new Set(categories.map((item) => item.id));
  const projects = [...projectMap.values()].map((item) => ({
    ...item,
    categoryId:
      item.categoryId && categoryIds.has(item.categoryId) ? item.categoryId : null,
  }));

  return { projects, categories };
}

/**
 * 将清单载荷写入本机 projects.json（path 统一为 projects/<id>），并补全启动/构建模式。
 *
 * @param catalog - 云端形态的项目与分类
 * @returns 写入后的本机记录
 */
export async function applyCatalogToLocal(
  catalog: CatalogPayload | CatalogProject[],
): Promise<ProjectRecord[]> {
  const now = new Date().toISOString();
  const payload: CatalogPayload = Array.isArray(catalog)
    ? { projects: catalog, categories: [] }
    : {
        projects: catalog.projects ?? [],
        categories: catalog.categories ?? [],
      };

  const categories = payload.categories.map((item, index) => toLocalCategory(item, index));
  const categoryIds = new Set(categories.map((item) => item.id));

  const next: ProjectRecord[] = payload.projects.map((item) =>
    normalizeProjectRecord({
      id: item.id,
      name: item.name,
      repoUrl: item.repoUrl,
      branch: item.branch,
      path: path.join('projects', item.id),
      startCommand: item.startCommand,
      installCommand: item.installCommand,
      openUrl: item.openUrl,
      upstreamUrl: item.upstreamUrl,
      tags: item.tags,
      categoryId:
        item.categoryId && categoryIds.has(item.categoryId) ? item.categoryId : null,
      notes: item.notes,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
      startProfiles: item.startProfiles as ProjectRecord['startProfiles'],
      buildProfiles: item.buildProfiles as ProjectRecord['buildProfiles'],
      customCommands: item.customCommands as ProjectRecord['customCommands'],
      defaultProfileId: item.defaultProfileId,
      defaultBuildProfileId: item.defaultBuildProfileId,
      phases: item.phases as ProjectRecord['phases'],
      currentPhase: item.currentPhase,
    }),
  );
  const enriched = next.map((record) => {
    const root = resolveProjectPath(record.path);
    return refreshRecordProfiles(record, root) ?? record;
  });
  saveStore({ projects: enriched, categories });
  return enriched;
}

/**
 * 用云端清单覆盖本机 projects.json（显式拉取时使用）。
 *
 * @param catalog - 云端项目与分类
 * @returns 写入后的本机记录
 */
export async function syncLocalCatalogFromCloud(
  catalog: CatalogPayload | CatalogProject[],
): Promise<ProjectRecord[]> {
  return applyCatalogToLocal(catalog);
}

/**
 * 登录/注册后：合并本机与云端清单后写回本机，并尽量推回 Cloud。
 * 本机独有项目/分类（例如 Cloud 宕机期间新建）不会被旧云端数据抹掉。
 *
 * @param cloudCatalog - 刚拉取的云端清单
 * @returns 合并后的本机项目记录
 */
export async function mergeLocalCatalogWithCloud(
  cloudCatalog: CatalogPayload | CatalogProject[],
): Promise<ProjectRecord[]> {
  const cloud: CatalogPayload = Array.isArray(cloudCatalog)
    ? { projects: cloudCatalog, categories: [] }
    : {
        projects: cloudCatalog.projects ?? [],
        categories: cloudCatalog.categories ?? [],
      };
  const local = buildLocalCatalogPayload();
  const merged = mergeCatalogPayloads(local, cloud);
  const projects = await applyCatalogToLocal(merged);
  await pushCatalogIfLoggedIn();
  return projects;
}

/**
 * 组装当前本机清单推送载荷。
 *
 * @returns 云端清单载荷
 */
export function buildLocalCatalogPayload(): CatalogPayload {
  return {
    projects: loadProjects().map(toCatalogProject),
    categories: loadCategories(),
  };
}

/**
 * 若已登录，将当前本机清单推送到 Cloud（失败仅打日志）。
 *
 * @returns {Promise<void>}
 */
export async function pushCatalogIfLoggedIn(): Promise<void> {
  if (!getAuthToken()) {
    return;
  }
  try {
    await cloudPutCatalog(buildLocalCatalogPayload());
  } catch (error) {
    console.warn(
      '[labhub] 推送清单到 Cloud 失败',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * 按清单记录重新克隆项目到 projects/<id>，或自定义父目录下的 <id>。
 *
 * @param id - 项目 id
 * @param options.skipIfExists - 目录已存在则跳过并返回 null
 * @param options.targetBaseDir - 可选父目录（绝对或相对用户根）；空则用默认 projects/
 * @returns 项目视图；跳过时 null
 */
export async function restoreProjectFromCatalog(
  id: string,
  options: { skipIfExists?: boolean; targetBaseDir?: string } = {},
): Promise<ProjectView | null> {
  const record = findProject(id);
  if (!record) {
    throw new Error(`清单中无项目：${id}`);
  }

  const baseRaw = (options.targetBaseDir || '').trim();
  let absolutePath: string;
  let storedPath: string;
  if (baseRaw) {
    const baseDir = path.isAbsolute(baseRaw)
      ? path.normalize(baseRaw)
      : path.resolve(ROOT_DIR, baseRaw);
    if (baseDir === path.parse(baseDir).root) {
      throw new Error('恢复位置不能是磁盘根目录，请选择具体文件夹');
    }
    fs.mkdirSync(baseDir, { recursive: true });
    absolutePath = path.join(baseDir, record.id);
    storedPath = absolutePath;
  } else {
    absolutePath = path.join(PROJECTS_DIR, record.id);
    storedPath = path.join('projects', record.id);
  }

  if (fs.existsSync(absolutePath)) {
    if (options.skipIfExists) {
      return null;
    }
    throw new Error(`本地目录已存在：${absolutePath}`);
  }

  const next = normalizeProjectRecord({
    ...record,
    path: storedPath,
    updatedAt: new Date().toISOString(),
  });
  const cloned = await cloneRepository({
    repoUrl: next.repoUrl,
    targetDir: absolutePath,
    branch: next.branch,
    shallow: true,
    upstreamUrl: next.upstreamUrl,
  });
  const withProfiles = refreshRecordProfiles(
    {
      ...next,
      branch: cloned.branch,
      updatedAt: new Date().toISOString(),
    },
    absolutePath,
  ) ?? { ...next, branch: cloned.branch };
  upsertProject(withProfiles);
  syncCursorWorkspaceFile();
  return toProjectView(withProfiles);
}

/**
 * 判断本机项目目录是否存在。
 *
 * @param record - 项目记录
 * @returns 是否存在
 */
export function projectDirExists(record: ProjectRecord): boolean {
  return fs.existsSync(resolveProjectPath(record.path));
}
