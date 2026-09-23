import fs from 'node:fs';
import path from 'node:path';
import {
  APP_ROOT,
  CLIENT_DIST_DIR,
  INSTALL_DIR,
  PROJECTS_DIR,
  PUBLIC_CONFIG_PATH,
  ROOT_DIR,
  isPackagedApp,
} from './app-paths.js';
import { normalizeProjectRecord } from './profiles.js';
import type { CategoryRecord, ProjectRecord } from './types.js';
import { normalizeTags } from './tags.js';

export {
  APP_ROOT,
  CLIENT_DIST_DIR,
  INSTALL_DIR,
  PROJECTS_DIR,
  PUBLIC_CONFIG_PATH,
  ROOT_DIR,
  isPackagedApp,
};

/** 持久化数据目录（清单 / 登录态） */
export const DATA_DIR = path.join(ROOT_DIR, 'data');

/** 项目清单文件 */
export const STORE_PATH = path.join(DATA_DIR, 'projects.json');

type StoreFile = {
  version: number;
  projects: ProjectRecord[];
  categories?: CategoryRecord[];
};

/**
 * 确保 data / projects 目录存在。
 *
 * @returns {void}
 */
export function ensureDirs(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

/**
 * 将项目 path 解析为绝对路径。
 * 相对路径一律相对用户数据根（ROOT_DIR），与安装目录分离。
 *
 * @param projectPath - 清单中的 path 字段
 * @returns 绝对路径
 */
export function resolveProjectPath(projectPath: string): string {
  if (path.isAbsolute(projectPath)) {
    return projectPath;
  }
  return path.resolve(ROOT_DIR, projectPath);
}

/**
 * 规范化分类记录。
 *
 * @param item - 原始分类
 * @param index - 缺省 sortOrder 时的兜底序号
 * @returns 规范化后的分类
 */
function normalizeCategoryRecord(item: CategoryRecord, index = 0): CategoryRecord {
  const now = new Date().toISOString();
  return {
    id: String(item.id || '').trim(),
    name: String(item.name || '').trim() || '未命名分类',
    sortOrder: typeof item.sortOrder === 'number' && Number.isFinite(item.sortOrder) ? item.sortOrder : index,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

/**
 * 读取完整清单文件。
 *
 * @returns 项目与分类
 * @throws {Error} JSON 损坏时抛出
 */
export function loadStore(): { projects: ProjectRecord[]; categories: CategoryRecord[] } {
  ensureDirs();
  if (!fs.existsSync(STORE_PATH)) {
    return { projects: [], categories: [] };
  }
  const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as StoreFile;
  if (!Array.isArray(raw.projects)) {
    throw new Error('data/projects.json 格式无效：缺少 projects 数组');
  }
  const categories = (Array.isArray(raw.categories) ? raw.categories : [])
    .map((item, index) => normalizeCategoryRecord(item, index))
    .filter((item) => item.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'));

  const categoryIds = new Set(categories.map((item) => item.id));
  const projects = raw.projects.map((item) => {
    const categoryId = item.categoryId && categoryIds.has(item.categoryId) ? item.categoryId : null;
    return normalizeProjectRecord({
      ...item,
      openUrl: item.openUrl ?? null,
      tags: normalizeTags(item.tags),
      categoryId,
    });
  });

  return { projects, categories };
}

/**
 * 覆盖写入完整清单。
 *
 * @param store - 项目与分类
 * @returns {void}
 */
export function saveStore(store: {
  projects: ProjectRecord[];
  categories: CategoryRecord[];
}): void {
  ensureDirs();
  const categories = store.categories
    .map((item, index) => normalizeCategoryRecord(item, index))
    .filter((item) => item.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'));
  const categoryIds = new Set(categories.map((item) => item.id));
  const projects = store.projects.map((item) =>
    normalizeProjectRecord({
      ...item,
      categoryId: item.categoryId && categoryIds.has(item.categoryId) ? item.categoryId : null,
    }),
  );
  const payload: StoreFile = { version: 1, projects, categories };
  fs.writeFileSync(STORE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

/**
 * 读取项目清单；文件不存在时返回空列表。
 *
 * @returns 项目记录数组
 * @throws {Error} JSON 损坏时抛出
 */
export function loadProjects(): ProjectRecord[] {
  return loadStore().projects;
}

/**
 * 覆盖写入项目清单（保留现有分类）。
 *
 * @param projects - 完整项目列表
 * @returns {void}
 */
export function saveProjects(projects: ProjectRecord[]): void {
  const { categories } = loadStore();
  saveStore({ projects, categories });
}

/**
 * 读取分类列表。
 *
 * @returns 分类数组（已按 sortOrder 排序）
 */
export function loadCategories(): CategoryRecord[] {
  return loadStore().categories;
}

/**
 * 覆盖写入分类列表（保留现有项目，并清理失效 categoryId）。
 *
 * @param categories - 完整分类列表
 * @returns {void}
 */
export function saveCategories(categories: CategoryRecord[]): void {
  const { projects } = loadStore();
  saveStore({ projects, categories });
}

/**
 * 按 id 查找项目。
 *
 * @param id - 项目 id
 * @returns 记录或 undefined
 */
export function findProject(id: string): ProjectRecord | undefined {
  return loadProjects().find((item) => item.id === id);
}

/**
 * 按 id 查找分类。
 *
 * @param id - 分类 id
 * @returns 记录或 undefined
 */
export function findCategory(id: string): CategoryRecord | undefined {
  return loadCategories().find((item) => item.id === id);
}

/**
 * 插入或更新一条项目记录。
 *
 * @param record - 项目记录
 * @returns 写入后的记录
 */
export function upsertProject(record: ProjectRecord): ProjectRecord {
  const { projects, categories } = loadStore();
  const normalized = normalizeProjectRecord(record);
  const categoryIds = new Set(categories.map((item) => item.id));
  const nextRecord = normalizeProjectRecord({
    ...normalized,
    categoryId:
      normalized.categoryId && categoryIds.has(normalized.categoryId)
        ? normalized.categoryId
        : null,
  });
  const index = projects.findIndex((item) => item.id === nextRecord.id);
  if (index >= 0) {
    projects[index] = nextRecord;
  } else {
    projects.push(nextRecord);
  }
  saveStore({ projects, categories });
  return nextRecord;
}

/**
 * 插入或更新一条分类记录。
 *
 * @param record - 分类记录
 * @returns 写入后的记录
 */
export function upsertCategory(record: CategoryRecord): CategoryRecord {
  const { projects, categories } = loadStore();
  const normalized = normalizeCategoryRecord(record, categories.length);
  if (!normalized.id) {
    throw new Error('分类 id 不能为空');
  }
  const index = categories.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    categories[index] = normalized;
  } else {
    categories.push(normalized);
  }
  saveStore({ projects, categories });
  return normalized;
}

/**
 * 删除项目记录（不删除磁盘目录，由调用方决定）。
 *
 * @param id - 项目 id
 * @returns 是否删除成功
 */
export function removeProject(id: string): boolean {
  const { projects, categories } = loadStore();
  const next = projects.filter((item) => item.id !== id);
  if (next.length === projects.length) {
    return false;
  }
  saveStore({ projects: next, categories });
  return true;
}

/**
 * 删除分类；其下项目改为未分类。
 *
 * @param id - 分类 id
 * @returns 是否删除成功
 */
export function removeCategory(id: string): boolean {
  const { projects, categories } = loadStore();
  const nextCategories = categories.filter((item) => item.id !== id);
  if (nextCategories.length === categories.length) {
    return false;
  }
  const nextProjects = projects.map((item) =>
    item.categoryId === id
      ? normalizeProjectRecord({ ...item, categoryId: null, updatedAt: new Date().toISOString() })
      : item,
  );
  saveStore({ projects: nextProjects, categories: nextCategories });
  return true;
}
