import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * 执行命令并收集 stdout/stderr。
 *
 * @param command - 可执行文件
 * @param args - 参数列表
 * @param options.cwd - 工作目录
 * @param options.inherit - 是否把输出打到当前终端
 * @returns 退出码与输出
 */
export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; inherit?: boolean } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const { cwd, inherit = false } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    if (!inherit) {
      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

/**
 * 在指定目录执行 git 子命令。
 *
 * @param cwd - 仓库目录
 * @param args - git 参数
 * @returns 命令结果
 */
export function git(cwd: string, args: string[]) {
  return runCommand('git', args, { cwd });
}

/**
 * 判断目录是否为 git 仓库。
 *
 * @param dir - 目录
 * @returns 是否含 .git
 */
export function isGitRepo(dir: string): boolean {
  return fs.existsSync(path.join(dir, '.git'));
}

/**
 * 从 GitHub / Gitee URL 推导默认项目 id（仓库名）。
 *
 * @param repoUrl - 远程地址
 * @returns 建议 id
 * @throws {Error} URL 无法解析时抛出
 */
export function deriveProjectId(repoUrl: string): string {
  const cleaned = repoUrl.trim().replace(/\.git$/i, '');
  try {
    if (cleaned.startsWith('git@')) {
      const match = cleaned.match(/[:/]([^/]+)$/);
      if (!match) {
        throw new Error('无法解析 SSH 地址');
      }
      return sanitizeId(match[1]);
    }
    const url = new URL(cleaned);
    const parts = url.pathname.split('/').filter(Boolean);
    const name = parts[parts.length - 1];
    if (!name) {
      throw new Error('URL 缺少仓库名');
    }
    return sanitizeId(name);
  } catch (error) {
    throw new Error(`无法从地址解析项目 id：${(error as Error).message}`);
  }
}

/**
 * 规范化项目 id（仅保留安全字符）。
 *
 * @param value - 原始 id
 * @returns 安全 id
 * @throws {Error} 为空时抛出
 */
export function sanitizeId(value: string): string {
  const id = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!id) {
    throw new Error('项目 id 无效');
  }
  return id;
}

/**
 * 浅克隆远程仓库到目标目录；可选配置 upstream。
 *
 * @param options.repoUrl - origin URL（提交将推送到这里）
 * @param options.targetDir - 落地绝对路径
 * @param options.branch - 分支
 * @param options.shallow - 是否浅克隆
 * @param options.depth - 浅克隆深度
 * @param options.upstreamUrl - 可选上游（fork 同步用）
 * @returns {Promise<void>}
 * @throws {Error} clone 失败时抛出
 */
export async function cloneRepository(options: {
  repoUrl: string;
  targetDir: string;
  branch: string;
  shallow?: boolean;
  depth?: number;
  upstreamUrl?: string | null;
}): Promise<void> {
  const { repoUrl, targetDir, branch, shallow = true, depth = 1, upstreamUrl } = options;
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  if (fs.existsSync(targetDir)) {
    throw new Error(`目标目录已存在：${targetDir}`);
  }

  const args = ['clone', '--branch', branch, '--single-branch'];
  if (shallow) {
    args.push('--depth', String(depth));
  }
  args.push(repoUrl, targetDir);

  const result = await runCommand('git', args, { inherit: true });
  if (result.code !== 0) {
    throw new Error(`git clone 失败（exit ${result.code}）`);
  }

  if (upstreamUrl) {
    const add = await git(targetDir, ['remote', 'add', 'upstream', upstreamUrl]);
    if (add.code !== 0) {
      throw new Error(`添加 upstream 失败：${add.stderr || add.stdout}`);
    }
  }
}

/**
 * 读取仓库 HEAD / dirty / origin 摘要。
 *
 * @param cwd - 仓库目录
 * @returns git 摘要；非仓库时返回 null
 */
export async function readGitSummary(cwd: string): Promise<{
  branch: string | null;
  head: string | null;
  dirty: boolean;
  origin: string | null;
} | null> {
  if (!isGitRepo(cwd)) {
    return null;
  }
  const [branch, head, status, origin] = await Promise.all([
    git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']),
    git(cwd, ['rev-parse', '--short', 'HEAD']),
    git(cwd, ['status', '--porcelain']),
    git(cwd, ['remote', 'get-url', 'origin']),
  ]);
  return {
    branch: branch.code === 0 ? branch.stdout : null,
    head: head.code === 0 ? head.stdout : null,
    dirty: status.code === 0 ? status.stdout.length > 0 : false,
    origin: origin.code === 0 ? origin.stdout : null,
  };
}

/**
 * 拉取 origin 指定分支（快进）。
 *
 * @param cwd - 仓库目录
 * @param branch - 分支名
 * @returns {Promise<void>}
 * @throws {Error} 失败时抛出
 */
export async function pullOrigin(cwd: string, branch: string): Promise<void> {
  const fetch = await git(cwd, ['fetch', 'origin', branch, '--depth', '1']);
  if (fetch.code !== 0) {
    throw new Error(`fetch origin 失败：${fetch.stderr || fetch.stdout}`);
  }
  const merge = await git(cwd, ['merge', '--ff-only', `origin/${branch}`]);
  if (merge.code !== 0) {
    throw new Error(`快进合并失败：${merge.stderr || merge.stdout}`);
  }
}
