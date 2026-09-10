import fs from 'node:fs';
import path from 'node:path';
import type { CatalogProject } from './cloud-client.js';
import { toCatalogProject, cloudPutCatalog } from './cloud-client.js';
import { getAuthToken } from './auth-store.js';
import { cloneRepository } from './git.js';
import { normalizeProjectRecord } from './profiles.js';
import {
  findProject,
  loadProjects,
  PROJECTS_DIR,
  resolveProjectPath,
  saveProjects,
  upsertProject,
} from './store.js';
import { toProjectView } from './projects-service.js';
import type { ProjectRecord, ProjectView } from './types.js';

/**
 * 用云端清单覆盖本机 projects.json（path 统一为 projects/<id>）。
 *
 * @param catalog - 云端项目列表
 * @returns 写入后的本机记录
 */
export async function syncLocalCatalogFromCloud(
  catalog: CatalogProject[],
): Promise<ProjectRecord[]> {
  const now = new Date().toISOString();
  const next: ProjectRecord[] = catalog.map((item) =>
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
  saveProjects(next);
  return next;
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
    await cloudPutCatalog(loadProjects().map(toCatalogProject));
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
  await cloneRepository({
    repoUrl: next.repoUrl,
    targetDir: absolutePath,
    branch: next.branch,
    shallow: true,
    upstreamUrl: next.upstreamUrl,
  });
  upsertProject(next);
  return toProjectView(next);
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
