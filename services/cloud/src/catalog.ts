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
export async function getCatalog(userId: string): Promise<CatalogProject[]> {
  const row = (
    await query<{ projects_json: unknown }>('SELECT projects_json FROM catalogs WHERE user_id = $1', [
      userId,
    ])
  ).rows[0];
  if (!row) {
    return [];
  }
  try {
    const parsed =
      typeof row.projects_json === 'string'
        ? (JSON.parse(row.projects_json) as unknown)
        : row.projects_json;
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
export async function putCatalog(
  userId: string,
  projects: CatalogProject[],
): Promise<CatalogProject[]> {
  const now = new Date().toISOString();
  await query(
    `INSERT INTO catalogs (user_id, projects_json, updated_at) VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       projects_json = EXCLUDED.projects_json,
       updated_at = EXCLUDED.updated_at`,
    [userId, JSON.stringify(projects), now],
  );
  return projects;
}
