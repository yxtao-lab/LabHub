import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { INSTALL_DIR, ROOT_DIR, loadProjects, loadCategories, saveStore } from './store.js';
import { normalizeProjectRecord } from './profiles.js';
import { stopProject } from './projects-service.js';
import type { ProjectRecord } from './types.js';

/**
 * 规范化目录路径（去尾部分隔符）。
 *
 * @param dirPath - 路径
 * @returns 规范化绝对路径
 */
function normalizeDir(dirPath: string): string {
  return path.normalize(path.resolve(dirPath.trim().replace(/[\\/]+$/, '')));
}

/**
 * 判断 candidate 是否等于或位于 parent 之下。
 *
 * @param parent - 父目录
 * @param candidate - 待测路径
 * @returns 是否命中
 */
function isSameOrInside(parent: string, candidate: string): boolean {
  const a = normalizeDir(parent).toLowerCase();
  const b = normalizeDir(candidate).toLowerCase();
  return b === a || b.startsWith(`${a}${path.sep}`);
}

/**
 * 是否为盘符根目录。
 *
 * @param dirPath - 路径
 * @returns 是否根目录
 */
function isDriveRoot(dirPath: string): boolean {
  const normalized = normalizeDir(dirPath);
  const root = path.parse(normalized).root;
  return normalizeDir(root).toLowerCase() === normalized.toLowerCase();
}

/**
 * 停止全部托管进程，避免迁移时文件占用。
 *
 * @returns {Promise<void>}
 */
async function stopAllManagedProcesses(): Promise<void> {
  for (const project of loadProjects()) {
    try {
      await stopProject(project.id, null);
    } catch {
      // 忽略单个停止失败
    }
  }
}

/**
 * 复制目录或文件到目标。
 *
 * @param source - 源路径
 * @param target - 目标路径
 * @returns {void}
 */
function copyPathDeep(source: string, target: string): void {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(source, target, { recursive: true, force: true });
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

/**
 * 改写清单中落在旧数据根下的绝对路径。
 *
 * @param projects - 项目列表
 * @param oldRoot - 旧根
 * @param newRoot - 新根
 * @returns 改写后的列表与条数
 */
function rewriteProjectList(
  projects: ProjectRecord[],
  oldRoot: string,
  newRoot: string,
): { projects: ProjectRecord[]; rewrittenPaths: number } {
  let rewrittenPaths = 0;
  const next = projects.map((record) => {
    if (!path.isAbsolute(record.path)) {
      return record;
    }
    const abs = normalizeDir(record.path);
    if (!isSameOrInside(oldRoot, abs)) {
      return record;
    }
    rewrittenPaths += 1;
    return normalizeProjectRecord({
      ...record,
      path: path.join(newRoot, path.relative(oldRoot, abs)),
      updatedAt: new Date().toISOString(),
    });
  });
  return { projects: next, rewrittenPaths };
}

/**
 * 持久化新数据目录到注册表与安装目录指针文件。
 *
 * @param dataDir - 新数据根
 * @returns {void}
 */
export function persistDataDirConfig(dataDir: string): void {
  const normalized = normalizeDir(dataDir);
  fs.mkdirSync(normalized, { recursive: true });
  fs.mkdirSync(path.join(normalized, 'data'), { recursive: true });
  fs.mkdirSync(path.join(normalized, 'projects'), { recursive: true });
  fs.writeFileSync(path.join(normalized, 'labhub-home.txt'), `${normalized}\n`, 'utf8');
  try {
    fs.writeFileSync(path.join(INSTALL_DIR, 'labhub-data-dir.txt'), `${normalized}\n`, 'utf8');
  } catch {
    // 安装目录可能无写权限
  }
  if (process.platform === 'win32') {
    spawnSync(
      'reg',
      ['add', 'HKCU\\Software\\LabHub', '/v', 'DataDir', '/t', 'REG_SZ', '/d', normalized, '/f'],
      { windowsHide: true, encoding: 'utf8' },
    );
    spawnSync(
      'reg',
      ['add', 'HKCU\\Software\\LabHub', '/v', 'InstallDir', '/t', 'REG_SZ', '/d', INSTALL_DIR, '/f'],
      { windowsHide: true, encoding: 'utf8' },
    );
  }
  process.env.LABHUB_HOME = normalized;
  process.env.LABHUB_PROJECTS_DIR = path.join(normalized, 'projects');
}

/**
 * 迁移数据目录：复制 data/projects/工作区等，改写绝对路径，持久化配置。
 * 完成后需重启应用才能让 ROOT_DIR 常量生效。
 *
 * @param targetDir - 新数据根目录
 * @returns 迁移结果
 */
export async function migrateDataDirectory(targetDir: string): Promise<{
  oldDataDir: string;
  newDataDir: string;
  projectsDir: string;
  rewrittenPaths: number;
  relaunchRequired: boolean;
}> {
  const oldRoot = normalizeDir(ROOT_DIR);
  const newRoot = normalizeDir(targetDir);
  if (!newRoot) {
    throw new Error('请选择新的数据目录');
  }
  if (isDriveRoot(newRoot)) {
    throw new Error('数据目录不能是磁盘根目录');
  }
  if (normalizeDir(INSTALL_DIR).toLowerCase() === newRoot.toLowerCase()) {
    throw new Error('数据目录不能与程序安装目录相同');
  }
  if (isSameOrInside(INSTALL_DIR, newRoot)) {
    throw new Error('数据目录请勿放在程序安装目录内部');
  }
  if (oldRoot.toLowerCase() === newRoot.toLowerCase()) {
    throw new Error('新目录与当前数据目录相同');
  }
  if (isSameOrInside(oldRoot, newRoot)) {
    throw new Error('新目录不能位于当前数据目录内部');
  }
  if (isSameOrInside(newRoot, oldRoot)) {
    throw new Error('新目录不能是当前数据目录的上级目录');
  }

  await stopAllManagedProcesses();
  fs.mkdirSync(newRoot, { recursive: true });

  const existing = fs.readdirSync(newRoot).filter((name) => name !== '.' && name !== '..');
  if (existing.length > 0) {
    const looksLikeLabhub = existing.some((name) =>
      ['data', 'projects', 'labhub-home.txt', 'labhub.code-workspace'].includes(name),
    );
    if (!looksLikeLabhub) {
      throw new Error(`目标目录非空：${newRoot}。请选择空目录，或已有 LabHub 数据的目录。`);
    }
  }

  for (const name of ['data', 'projects', 'labhub.code-workspace', '.env']) {
    const source = path.join(oldRoot, name);
    if (!fs.existsSync(source)) {
      continue;
    }
    copyPathDeep(source, path.join(newRoot, name));
  }
  fs.mkdirSync(path.join(newRoot, 'data'), { recursive: true });
  fs.mkdirSync(path.join(newRoot, 'projects'), { recursive: true });

  const storePath = path.join(newRoot, 'data', 'projects.json');
  let rewrittenPaths = 0;
  if (fs.existsSync(storePath)) {
    const raw = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      version?: number;
      projects?: ProjectRecord[];
      categories?: ReturnType<typeof loadCategories>;
    };
    const list = Array.isArray(raw.projects) ? raw.projects : [];
    const rewritten = rewriteProjectList(list, oldRoot, newRoot);
    rewrittenPaths = rewritten.rewrittenPaths;
    fs.writeFileSync(
      storePath,
      `${JSON.stringify(
        {
          version: raw.version ?? 1,
          projects: rewritten.projects,
          categories: raw.categories ?? [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  } else {
    const rewritten = rewriteProjectList(loadProjects(), oldRoot, newRoot);
    rewrittenPaths = rewritten.rewrittenPaths;
    if (rewrittenPaths > 0) {
      saveStore({
        projects: rewritten.projects,
        categories: loadCategories(),
      });
      const oldStore = path.join(oldRoot, 'data', 'projects.json');
      if (fs.existsSync(oldStore)) {
        copyPathDeep(oldStore, storePath);
      }
    }
  }

  persistDataDirConfig(newRoot);
  return {
    oldDataDir: oldRoot,
    newDataDir: newRoot,
    projectsDir: path.join(newRoot, 'projects'),
    rewrittenPaths,
    relaunchRequired: true,
  };
}
