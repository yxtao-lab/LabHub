import { z } from 'zod';
import { getDb } from './db.js';

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
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startProfiles: z.array(z.unknown()).optional(),
  buildProfiles: z.array(z.unknown()).optional(),
  defaultProfileId: z.string().nullable().optional(),
  defaultBuildProfileId: z.string().nullable().optional(),
  phases: z.array(z.unknown()).optional(),
  currentPhase: z.string().nullable().optional(),
});

export const catalogBodySchema = z.object({
  projects: z.array(catalogProjectSchema),
});

export type CatalogProject = z.infer<typeof catalogProjectSchema>;

/**
 * 读取用户云端清单。
 *
 * @param userId - 用户 id
 * @returns 项目元数据列表
 */
export function getCatalog(userId: string): CatalogProject[] {
  const row = getDb()
    .prepare('SELECT projects_json FROM catalogs WHERE user_id = ?')
    .get(userId) as { projects_json: string } | undefined;
  if (!row) {
    return [];
  }
  try {
    const parsed = JSON.parse(row.projects_json) as unknown;
    const result = z.array(catalogProjectSchema).safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/**
 * 覆盖写入用户云端清单。
 *
 * @param userId - 用户 id
 * @param projects - 项目列表
 * @returns 写入后的列表
 */
export function putCatalog(userId: string, projects: CatalogProject[]): CatalogProject[] {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO catalogs (user_id, projects_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         projects_json = excluded.projects_json,
         updated_at = excluded.updated_at`,
    )
    .run(userId, JSON.stringify(projects), now);
  return projects;
}
