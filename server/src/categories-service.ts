import { z } from 'zod';
import { pushCatalogIfLoggedIn } from './catalog-sync.js';
import { sanitizeId } from './git.js';
import {
  findCategory,
  loadCategories,
  removeCategory,
  upsertCategory,
} from './store.js';
import type { CategoryRecord } from './types.js';

export const addCategorySchema = z.object({
  name: z.string().min(1).max(64),
  id: z.string().min(1).max(64).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(64).optional(),
  sortOrder: z.number().int().optional(),
});

/**
 * 尝试把字符串压成安全 id；纯中文等无法映射时返回空串。
 *
 * @param value - 原始字符串
 * @returns 安全 id 或空串
 */
function trySanitizeId(value: string): string {
  try {
    return sanitizeId(value);
  } catch {
    return '';
  }
}

/**
 * 为新分类分配唯一 id（支持中文名称：无法 slug 时用 cat- 前缀时间戳）。
 *
 * @param preferred - 可选显式 id
 * @param name - 分类显示名
 * @param existing - 已有分类
 * @returns 唯一分类 id
 */
function allocateCategoryId(
  preferred: string | undefined,
  name: string,
  existing: CategoryRecord[],
): string {
  let base = preferred?.trim() ? trySanitizeId(preferred) : '';
  if (!base) {
    base = trySanitizeId(name);
  }
  if (!base) {
    base = `cat-${Date.now().toString(36)}`;
  }
  const taken = new Set(existing.map((item) => item.id));
  if (!taken.has(base)) {
    return base;
  }
  let index = 2;
  while (taken.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

/**
 * 列出全部分类（已排序）。
 *
 * @returns 分类列表
 */
export function listCategories(): CategoryRecord[] {
  return loadCategories();
}

/**
 * 新建分类。
 *
 * @param input - 名称等
 * @returns 新建的分类
 * @throws {Error} 名称冲突时抛出
 */
export async function addCategory(
  input: z.infer<typeof addCategorySchema>,
): Promise<CategoryRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('分类名称不能为空');
  }
  const existing = loadCategories();
  if (existing.some((item) => item.name === name)) {
    throw new Error(`分类名称已存在：${name}`);
  }
  const id = allocateCategoryId(input.id, name, existing);
  const now = new Date().toISOString();
  const maxOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1);
  const record = upsertCategory({
    id,
    name,
    sortOrder: input.sortOrder ?? maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  });
  await pushCatalogIfLoggedIn();
  return record;
}

/**
 * 更新分类名称或排序。
 *
 * @param id - 分类 id
 * @param patch - 可更新字段
 * @returns 更新后的分类
 * @throws {Error} 不存在或名称冲突时抛出
 */
export async function updateCategory(
  id: string,
  patch: z.infer<typeof updateCategorySchema>,
): Promise<CategoryRecord> {
  const current = findCategory(id);
  if (!current) {
    throw new Error(`分类不存在：${id}`);
  }
  const nextName = patch.name !== undefined ? patch.name.trim() : current.name;
  if (!nextName) {
    throw new Error('分类名称不能为空');
  }
  const others = loadCategories().filter((item) => item.id !== id);
  if (others.some((item) => item.name === nextName)) {
    throw new Error(`分类名称已存在：${nextName}`);
  }
  const record = upsertCategory({
    ...current,
    name: nextName,
    sortOrder: patch.sortOrder ?? current.sortOrder,
    updatedAt: new Date().toISOString(),
  });
  await pushCatalogIfLoggedIn();
  return record;
}

/**
 * 删除分类（项目改为未分类）。
 *
 * @param id - 分类 id
 * @returns {void}
 * @throws {Error} 不存在时抛出
 */
export async function deleteCategory(id: string): Promise<void> {
  if (!removeCategory(id)) {
    throw new Error(`分类不存在：${id}`);
  }
  await pushCatalogIfLoggedIn();
}
