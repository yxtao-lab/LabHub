import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadProjects, PROJECTS_DIR, ROOT_DIR, resolveProjectPath } from './store.js';

/** 多根工作区文件名（便于 Cursor / VS Code 识别托管仓） */
export const WORKSPACE_FILE_NAME = 'labhub.code-workspace';

/**
 * 工作区文件绝对路径。
 *
 * @returns 绝对路径
 */
export function getWorkspaceFilePath(): string {
  return path.join(ROOT_DIR, WORKSPACE_FILE_NAME);
}

/**
 * 根据本机清单生成 Cursor/VS Code 多根工作区定义。
 * 根目录 `projects/*` 被 gitignore，仅「打开文件夹」时嵌套仓不会进源代码管理；
 * 必须以 `.code-workspace` 多根方式打开，各托管仓才会出现在 SCM。
 *
 * @returns 写入的绝对路径
 */
export function syncCursorWorkspaceFile(): string {
  const workspacePath = getWorkspaceFilePath();
  const folders: Array<{ name: string; path: string }> = [
    { name: 'LabHub', path: ROOT_DIR.replace(/\\/g, '/') },
  ];
  const knownAbs = new Set<string>([path.normalize(ROOT_DIR).toLowerCase()]);

  const pushFolder = (name: string, absolutePath: string) => {
    const normalized = path.normalize(absolutePath);
    const key = normalized.toLowerCase();
    if (knownAbs.has(key)) {
      return;
    }
    if (!fs.existsSync(normalized)) {
      return;
    }
    const gitDir = path.join(normalized, '.git');
    if (!fs.existsSync(gitDir)) {
      return;
    }
    knownAbs.add(key);
    folders.push({
      name,
      path: normalized.replace(/\\/g, '/'),
    });
  };

  for (const record of loadProjects()) {
    pushFolder(record.name || record.id, resolveProjectPath(record.path));
  }

  if (fs.existsSync(PROJECTS_DIR)) {
    for (const entry of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }
      pushFolder(entry.name, path.join(PROJECTS_DIR, entry.name));
    }
  }

  const payload = {
    folders,
    settings: {
      'git.autoRepositoryDetection': true,
      'git.repositoryScanMaxDepth': 4,
      'git.openRepositoryInParentFolders': 'always',
    },
  };
  const next = `${JSON.stringify(payload, null, 2)}\n`;
  const previous = fs.existsSync(workspacePath)
    ? fs.readFileSync(workspacePath, 'utf8')
    : '';
  if (previous !== next) {
    fs.writeFileSync(workspacePath, next, 'utf8');
    console.log(
      `[labhub] 已更新 ${WORKSPACE_FILE_NAME}（${folders.length} 个工作区根）`,
    );
  }
  return workspacePath;
}

/**
 * 用本机 Cursor / VS Code CLI 打开多根工作区（复用当前窗口）。
 *
 * @returns 选用的命令与工作区路径
 * @throws {Error} 找不到 CLI 时抛出
 */
export function openCursorWorkspace(): { command: string; workspacePath: string } {
  const workspacePath = syncCursorWorkspaceFile();
  const candidates =
    process.platform === 'win32'
      ? ['cursor.cmd', 'cursor', 'code.cmd', 'code']
      : ['cursor', 'code'];

  let lastError: Error | null = null;
  for (const command of candidates) {
    try {
      const child = spawn(command, [workspacePath], {
        detached: true,
        stdio: 'ignore',
        shell: true,
        windowsHide: true,
      });
      child.unref();
      console.log(`[labhub] 已请求用 ${command} 打开工作区：${workspacePath}`);
      return { command, workspacePath };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error('未找到 cursor / code 命令，请手动打开 labhub.code-workspace');
}
