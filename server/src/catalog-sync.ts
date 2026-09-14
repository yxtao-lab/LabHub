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
 * 用云端清单覆盖本机 projects.json（path 统一为 projects/<id>）。
 * 覆盖后会按本地 package.json 补全启动/构建模式。
 *
 * @param catalog - 云端项目与分类
 * @returns 写入后的本机记录
 */
export async function syncLocalCatalogFromCloud(
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
 * 按清单记录重新克隆项目到 projects/<id>。
 *
 * @param id - 项目 id
 * @param options.skipIfExists - 目录已存在则跳过并返回 null
 * @returns 项目视图；跳过时 null
 */
export async function restoreProjectFromCatalog(
  id: string,
  options: { skipIfExists?: boolean } = {},
): Promise<ProjectView | null> {
  const record = findProject(id);
  if (!record) {
    throw new Error(`清单中无项目：${id}`);
  }
  const absolutePath = path.join(PROJECTS_DIR, record.id);
  if (fs.existsSync(absolutePath)) {
    if (options.skipIfExists) {
      return null;
    }
    throw new Error(`本地目录已存在：${absolutePath}`);
  }

  const next = normalizeProjectRecord({
    ...record,
    path: path.join('projects', record.id),
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
