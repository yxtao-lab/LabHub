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
 * 探测远程仓库默认分支（git ls-remote --symref HEAD）。
 *
 * @param repoUrl - 远程地址
 * @returns 默认分支名；探测失败时 null
 */
export async function detectRemoteDefaultBranch(repoUrl: string): Promise<string | null> {
  const result = await runCommand('git', ['ls-remote', '--symref', repoUrl, 'HEAD']);
  if (result.code !== 0) {
    return null;
  }
  const match = result.stdout.match(/ref:\s*refs\/heads\/(\S+)/);
  return match?.[1] ?? null;
}

/**
 * 列出远程仓库全部分支（git ls-remote --heads）。
 *
 * @param repoUrl - 远程地址
 * @returns 分支名列表（已排序）与默认分支
 * @throws {Error} ls-remote 失败时抛出
 */
export async function listRemoteBranches(repoUrl: string): Promise<{
  branches: string[];
  defaultBranch: string | null;
}> {
  const trimmed = repoUrl.trim();
  if (!trimmed) {
    throw new Error('仓库 URL 不能为空');
  }
  const [heads, defaultBranch] = await Promise.all([
    runCommand('git', ['ls-remote', '--heads', trimmed]),
    detectRemoteDefaultBranch(trimmed).catch(() => null),
  ]);
  if (heads.code !== 0) {
    throw new Error(
      `无法读取远程分支：${heads.stderr || heads.stdout || `exit ${heads.code}`}`,
    );
  }
  const branches = [
    ...new Set(
      heads.stdout
        .split(/\r?\n/)
        .map((line) => {
          const match = line.match(/refs\/heads\/(\S+)/);
          return match?.[1] ?? '';
        })
        .filter(Boolean),
    ),
  ].sort((a, b) => {
    if (defaultBranch && a === defaultBranch) return -1;
    if (defaultBranch && b === defaultBranch) return 1;
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    if (a === 'master') return -1;
    if (b === 'master') return 1;
    return a.localeCompare(b);
  });
  return {
    branches,
    defaultBranch: defaultBranch && branches.includes(defaultBranch) ? defaultBranch : branches[0] ?? null,
  };
}

/**
 * 组装克隆分支候选：用户指定 → 远程默认 → main → master（去重）。
 *
 * @param preferred - 用户填写的分支；空则靠自动探测
 * @param detected - 远程默认分支
 * @returns 有序候选列表
 */
export function buildCloneBranchCandidates(
  preferred?: string | null,
  detected?: string | null,
): string[] {
  const candidates: string[] = [];
  const pushUnique = (value: string | null | undefined) => {
    const branch = value?.trim();
    if (!branch || candidates.includes(branch)) {
      return;
    }
    candidates.push(branch);
  };
  pushUnique(preferred);
  pushUnique(detected);
  pushUnique('main');
  pushUnique('master');
  return candidates;
}

/**
 * 删除可能残留的半成品克隆目录。
 *
 * @param targetDir - 目标目录
 * @returns {void}
 */
function removeCloneTarget(targetDir: string): void {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
}

/** git clone --progress 解析出的进度 */
export type GitCloneProgress = {
  stage: string;
  percent: number;
  received: number;
  total: number;
  remaining: number;
  speed: string | null;
  raw: string;
};

/**
 * 解析 git --progress 输出行（可能含 \\r 刷新）。
 *
 * @param text - stderr 片段
 * @returns 最新一条可解析进度；无法解析时 null
 */
export function parseGitProgressChunk(text: string): GitCloneProgress | null {
  const lines = text
    .split(/\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let latest: GitCloneProgress | null = null;
  for (const line of lines) {
    const match = line.match(
      /(Counting objects|Compressing objects|Receiving objects|Resolving deltas):\s*(\d+)%\s*\((\d+)\/(\d+)\)(?:,\s*(.+))?$/i,
    );
    if (!match) {
      continue;
    }
    const received = Number(match[3]);
    const total = Number(match[4]);
    const extra = (match[5] || '').trim();
    const speedMatch = extra.match(/(\d+(?:\.\d+)?\s*[KMG]?i?B\/s)/i);
    latest = {
      stage: match[1]!,
      percent: Number(match[2]),
      received,
      total,
      remaining: Math.max(0, total - received),
      speed: speedMatch?.[1] ?? null,
      raw: line,
    };
  }
  return latest;
}

/**
 * 带进度回调执行 git 命令（读取 stderr 中的 --progress）。
 *
 * @param args - git 参数
 * @param options.cwd - 工作目录；克隆时可省略
 * @param options.onProgress - 进度回调
 * @returns 退出码与 stderr
 */
function runGitWithProgress(
  args: string[],
  options: {
    cwd?: string;
    onProgress?: (progress: GitCloneProgress) => void;
  } = {},
): Promise<{ code: number; stderr: string }> {
  const { cwd, onProgress } = options;
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stderr = '';
    let buffer = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      buffer += text;
      const progress = parseGitProgressChunk(buffer);
      if (progress) {
        onProgress?.(progress);
        const lastBreak = Math.max(buffer.lastIndexOf('\r'), buffer.lastIndexOf('\n'));
        buffer = lastBreak >= 0 ? buffer.slice(lastBreak + 1) : buffer.slice(-200);
      }
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stderr: stderr.trim() });
    });
  });
}

/**
 * 浅克隆远程仓库到目标目录；可选配置 upstream。
 * 分支可留空：会自动尝试远程默认分支以及 main / master。
 *
 * @param options.repoUrl - origin URL（提交将推送到这里）
 * @param options.targetDir - 落地绝对路径
 * @param options.branch - 首选分支；空则自动尝试
 * @param options.shallow - 是否浅克隆
 * @param options.depth - 浅克隆深度
 * @param options.upstreamUrl - 可选上游（fork 同步用）
 * @param options.onProgress - 克隆进度回调
 * @param options.onStatus - 阶段状态文案回调
 * @returns 实际克隆成功的分支名
 * @throws {Error} 全部候选失败时抛出
 */
export async function cloneRepository(options: {
  repoUrl: string;
  targetDir: string;
  branch?: string | null;
  shallow?: boolean;
  depth?: number;
  upstreamUrl?: string | null;
  onProgress?: (progress: GitCloneProgress) => void;
  onStatus?: (message: string) => void;
}): Promise<{ branch: string }> {
  const {
    repoUrl,
    targetDir,
    shallow = true,
    depth = 1,
    upstreamUrl,
    onProgress,
    onStatus,
  } = options;
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  if (fs.existsSync(targetDir)) {
    throw new Error(`目标目录已存在：${targetDir}`);
  }

  const preferred = options.branch?.trim() || '';
  let detected: string | null = null;
  try {
    onStatus?.('正在探测远程默认分支…');
    detected = await detectRemoteDefaultBranch(repoUrl);
  } catch {
    detected = null;
  }
  const candidates = buildCloneBranchCandidates(preferred || null, detected);
  const errors: string[] = [];

  for (const branch of candidates) {
    removeCloneTarget(targetDir);
    onStatus?.(`正在克隆分支 ${branch}…`);
    const args = ['clone', '--progress', '--branch', branch, '--single-branch'];
    if (shallow) {
      args.push('--depth', String(depth));
    }
    args.push(repoUrl, targetDir);

    const result = await runGitWithProgress(args, { onProgress });
    if (result.code === 0) {
      if (upstreamUrl) {
        onStatus?.('正在配置 upstream…');
        const add = await git(targetDir, ['remote', 'add', 'upstream', upstreamUrl]);
        if (add.code !== 0) {
          removeCloneTarget(targetDir);
          throw new Error(`添加 upstream 失败：${add.stderr || add.stdout}`);
        }
      }
      return { branch };
    }
    errors.push(
      `${branch}: exit ${result.code}${result.stderr ? ` (${result.stderr.slice(-300)})` : ''}`,
    );
    removeCloneTarget(targetDir);
  }

  throw new Error(
    `git clone 失败，已尝试分支 ${candidates.join(' / ')}。${errors.join('；')}`,
  );
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
 * 列出本地仓库可见分支 + 远程 heads（浅克隆也能看到远程全部分支）。
 *
 * @param cwd - 仓库目录
 * @returns 当前分支与分支列表
 * @throws {Error} 非仓库或探测失败时抛出
 */
export async function listProjectBranches(cwd: string): Promise<{
  current: string | null;
  branches: string[];
}> {
  if (!isGitRepo(cwd)) {
    throw new Error(`不是 Git 仓库：${cwd}`);
  }
  const currentResult = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const current =
    currentResult.code === 0 && currentResult.stdout !== 'HEAD'
      ? currentResult.stdout
      : null;

  const local = await git(cwd, ['branch', '--format=%(refname:short)']);
  const localBranches =
    local.code === 0
      ? local.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      : [];

  let remoteBranches: string[] = [];
  const origin = await git(cwd, ['remote', 'get-url', 'origin']);
  if (origin.code === 0 && origin.stdout) {
    try {
      const remote = await listRemoteBranches(origin.stdout);
      remoteBranches = remote.branches;
    } catch {
      const remoteRefs = await git(cwd, ['branch', '-r', '--format=%(refname:short)']);
      if (remoteRefs.code === 0) {
        remoteBranches = remoteRefs.stdout
          .split(/\r?\n/)
          .map((line) => line.trim().replace(/^origin\//, ''))
          .filter((name) => name && name !== 'HEAD' && !name.includes('->'));
      }
    }
  }

  const branches = [
    ...new Set([...localBranches, ...remoteBranches, ...(current ? [current] : [])]),
  ].sort((a, b) => {
    if (current && a === current) return -1;
    if (current && b === current) return 1;
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    if (a === 'master') return -1;
    if (b === 'master') return 1;
    return a.localeCompare(b);
  });

  return { current, branches };
}

/**
 * 校验分支名，避免注入异常 ref。
 *
 * @param branch - 用户输入的分支名
 * @returns 合法分支名
 * @throws {Error} 非法时抛出
 */
function assertSafeBranchName(branch: string): string {
  const target = branch.trim();
  if (!target) {
    throw new Error('分支名不能为空');
  }
  if (
    target.startsWith('-') ||
    target.includes('..') ||
    target.includes('\\') ||
    target.includes(' ') ||
    /[\x00-\x1f]/.test(target)
  ) {
    throw new Error(`非法分支名：${target}`);
  }
  return target;
}

/**
 * 让 origin 能拉取全部分支（覆盖 --single-branch 克隆只跟踪当前分支的限制）。
 *
 * @param cwd - 仓库目录
 * @returns {Promise<void>}
 */
async function ensureOriginFetchesAllHeads(cwd: string): Promise<void> {
  const current = await git(cwd, ['config', '--get-all', 'remote.origin.fetch']);
  if (current.code === 0 && current.stdout.includes('+refs/heads/*:refs/remotes/origin/*')) {
    return;
  }
  await git(cwd, ['config', '--unset-all', 'remote.origin.fetch']);
  await git(cwd, [
    'config',
    '--add',
    'remote.origin.fetch',
    '+refs/heads/*:refs/remotes/origin/*',
  ]);
}

/**
 * 浅拉取 origin 上指定分支到 refs/remotes/origin/<branch>。
 *
 * @param cwd - 仓库目录
 * @param branch - 分支名
 * @param onProgress - 可选 git 进度
 * @returns {Promise<void>}
 * @throws {Error} fetch 失败时抛出
 */
async function fetchOriginBranch(
  cwd: string,
  branch: string,
  onProgress?: (progress: GitCloneProgress) => void,
): Promise<void> {
  await ensureOriginFetchesAllHeads(cwd);
  const fetch = await runGitWithProgress(
    [
      'fetch',
      '--progress',
      'origin',
      `+refs/heads/${branch}:refs/remotes/origin/${branch}`,
      '--depth',
      '1',
    ],
    { cwd, onProgress },
  );
  if (fetch.code !== 0) {
    throw new Error(`拉取分支 ${branch} 失败：${fetch.stderr}`);
  }
}

/**
 * 切换到指定分支（必要时从 origin 浅拉取该分支）。
 *
 * @param cwd - 仓库目录
 * @param branch - 目标分支名
 * @returns 切换后的当前分支
 * @throws {Error} 切换失败时抛出
 */
export async function checkoutProjectBranch(
  cwd: string,
  branch: string,
  options: {
    onStatus?: (message: string) => void;
    onProgress?: (progress: GitCloneProgress) => void;
  } = {},
): Promise<{ branch: string }> {
  const target = assertSafeBranchName(branch);
  if (!isGitRepo(cwd)) {
    throw new Error(`不是 Git 仓库：${cwd}`);
  }

  const current = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (current.code === 0 && current.stdout === target) {
    options.onStatus?.(`已在分支 ${target}`);
    return { branch: target };
  }

  options.onStatus?.(`正在拉取远程分支 ${target}…`);
  await fetchOriginBranch(cwd, target, options.onProgress);

  options.onStatus?.(`正在检出 ${target}…`);
  const checkout = await git(cwd, ['checkout', '-B', target, `origin/${target}`]);
  if (checkout.code !== 0) {
    const fallback = await git(cwd, ['checkout', target]);
    if (fallback.code !== 0) {
      throw new Error(
        `切换分支失败：${checkout.stderr || fallback.stderr || checkout.stdout || fallback.stdout}`,
      );
    }
  }

  options.onStatus?.('正在关联 origin…');
  await git(cwd, ['branch', `--set-upstream-to=origin/${target}`, target]);

  const after = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return { branch: after.code === 0 ? after.stdout : target };
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
  const target = assertSafeBranchName(branch);
  await fetchOriginBranch(cwd, target);
  const merge = await git(cwd, ['merge', '--ff-only', `origin/${target}`]);
  if (merge.code !== 0) {
    throw new Error(`快进合并失败：${merge.stderr || merge.stdout}`);
  }
}
