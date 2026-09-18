import { z } from 'zod';
import { query } from './db.js';

const catalogProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  repoUrl: z.string().min(1),
  branch: z.string().min(1),
  startCommand: z.string().min(1),
  installCommand: z.string(),
  openUrl: z.string().nullable(),
  upstreamUrl: z.string().nullable(),
  tags: z.array(z.string()),
  categoryId: z.string().nullable().optional(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startProfiles: z.array(z.unknown()).optional(),
  buildProfiles: z.array(z.unknown()).optional(),
  customCommands: z.array(z.unknown()).optional(),
  defaultProfileId: z.string().nullable().optional(),
  defaultBuildProfileId: z.string().nullable().optional(),
  phases: z.array(z.unknown()).optional(),
  currentPhase: z.string().nullable().optional(),
});

const catalogCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const catalogBodySchema = z.object({
  projects: z.array(catalogProjectSchema),
  categories: z.array(catalogCategorySchema).optional().default([]),
});

export type CatalogProject = z.infer<typeof catalogProjectSchema>;
export type CatalogCategory = z.infer<typeof catalogCategorySchema>;
export type CatalogData = {
  projects: CatalogProject[];
  categories: CatalogCategory[];
};

/**
 * 解析 projects_json：兼容旧版「纯数组」与新版「{ projects, categories }」。
 *
 * @param raw - 数据库 JSON
 * @returns 项目与分类
 */
function parseCatalogJson(raw: unknown): CatalogData {
  try {
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
    if (Array.isArray(parsed)) {
      const result = z.array(catalogProjectSchema).safeParse(parsed);
      return { projects: result.success ? result.data : [], categories: [] };
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as { projects?: unknown; categories?: unknown };
      const projectsResult = z.array(catalogProjectSchema).safeParse(obj.projects ?? []);
      const categoriesResult = z.array(catalogCategorySchema).safeParse(obj.categories ?? []);
      return {
        projects: projectsResult.success ? projectsResult.data : [],
        categories: categoriesResult.success ? categoriesResult.data : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { projects: [], categories: [] };
}

/**
 * 读取用户云端清单。
 *
 * @param userId - 用户 id
 * @returns 项目与分类元数据
 */
export async function getCatalog(userId: string): Promise<CatalogData> {
  const row = (
    await query<{ projects_json: unknown }>('SELECT projects_json FROM catalogs WHERE user_id = $1', [
      userId,
    ])
  ).rows[0];
  if (!row) {
    return { projects: [], categories: [] };
  }
  return parseCatalogJson(row.projects_json);
}

/**
 * 覆盖写入用户云端清单。
 *
 * @param userId - 用户 id
 * @param data - 项目与分类
 * @returns 写入后的数据
 */
export async function putCatalog(userId: string, data: CatalogData): Promise<CatalogData> {
  const now = new Date().toISOString();
  const payload: CatalogData = {
    projects: data.projects,
    categories: data.categories ?? [],
  };
  await query(
    `INSERT INTO catalogs (user_id, projects_json, updated_at) VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       projects_json = EXCLUDED.projects_json,
       updated_at = EXCLUDED.updated_at`,
    [userId, JSON.stringify(payload), now],
  );
  return payload;
}
