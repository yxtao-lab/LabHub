import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeProjectRecord } from './profiles.js';
import type { ProjectRecord } from './types.js';
import { normalizeTags } from './tags.js';

const serverDir = path.dirname(fileURLToPath(import.meta.url));

/** labhub 仓库根目录 */
export const ROOT_DIR = path.resolve(serverDir, '../..');

/** 托管项目默认落地目录 */
export const PROJECTS_DIR = path.join(ROOT_DIR, 'projects');

/** 持久化数据目录 */
export const DATA_DIR = path.join(ROOT_DIR, 'data');

/** 项目清单文件 */
export const STORE_PATH = path.join(DATA_DIR, 'projects.json');

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

type StoreFile = {
  version: number;
  projects: ProjectRecord[];
};

/**
 * 读取项目清单；文件不存在时返回空列表。
 *
 * @returns 项目记录数组
 * @throws {Error} JSON 损坏时抛出
 */
export function loadProjects(): ProjectRecord[] {
  ensureDirs();
  if (!fs.existsSync(STORE_PATH)) {
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as StoreFile;
  if (!Array.isArray(raw.projects)) {
    throw new Error('data/projects.json 格式无效：缺少 projects 数组');
  }
  return raw.projects.map((item) =>
    normalizeProjectRecord({
      ...item,
      openUrl: item.openUrl ?? null,
      tags: normalizeTags(item.tags),
    }),
  );
}

/**
 * 覆盖写入项目清单。
 *
 * @param projects - 完整项目列表
 * @returns {void}
 */
export function saveProjects(projects: ProjectRecord[]): void {
  ensureDirs();
  const payload: StoreFile = { version: 1, projects };
  fs.writeFileSync(STORE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
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
 * 插入或更新一条项目记录。
 *
 * @param record - 项目记录
 * @returns 写入后的记录
 */
export function upsertProject(record: ProjectRecord): ProjectRecord {
  const normalized = normalizeProjectRecord(record);
  const projects = loadProjects();
  const index = projects.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    projects[index] = normalized;
  } else {
    projects.push(normalized);
  }
  saveProjects(projects);
  return normalized;
}

/**
 * 删除项目记录（不删除磁盘目录，由调用方决定）。
 *
 * @param id - 项目 id
 * @returns 是否删除成功
 */
export function removeProject(id: string): boolean {
  const projects = loadProjects();
  const next = projects.filter((item) => item.id !== id);
  if (next.length === projects.length) {
    return false;
  }
  saveProjects(next);
  return true;
}
