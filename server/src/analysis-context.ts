import fs from 'node:fs';
import path from 'node:path';
import type { ProjectRecord } from './types.js';
import { resolveProjectPath } from './store.js';

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  'out',
  'target',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
]);

const PRIORITY_FILES = [
  'README.md',
  'readme.md',
  'README.zh-CN.md',
  'CHANGELOG.md',
  'LICENSE',
  'LICENSE.md',
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'pyproject.toml',
  'requirements.txt',
  'go.mod',
  'Cargo.toml',
  'pom.xml',
  'composer.json',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.env.example',
  '.env.sample',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
];

const MAX_FILE_CHARS = 24_000;
const MAX_TOTAL_CHARS = 90_000;
const MAX_WALK_FILES = 40;

/**
 * 安全读取文本；失败或不存在返回 null。
 *
 * @param filePath - 绝对路径
 * @param maxChars - 最大字符数
 * @returns 文本或 null
 */
function readTextSafe(filePath: string, maxChars = MAX_FILE_CHARS): string | null {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return null;
    }
    const text = fs.readFileSync(filePath, 'utf8');
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n…(截断)` : text;
  } catch {
    return null;
  }
}

/**
 * 判断相对路径是否应跳过（含敏感实值文件）。
 *
 * @param relativePath - 相对项目根的路径
 * @returns 是否跳过
 */
function shouldSkipFile(relativePath: string): boolean {
  const base = path.basename(relativePath);
  const normalized = relativePath.replace(/\\/g, '/');
  if (base === '.env' || base === '.env.local' || /\.env\.(local|production|development)$/.test(base)) {
    return true;
  }
  if (normalized.includes('/node_modules/') || normalized.startsWith('node_modules/')) {
    return true;
  }
  return false;
}

/**
 * 深度优先收集有限数量的源码/配置文件相对路径。
 *
 * @param root - 项目根
 * @param relativeDir - 相对子目录
 * @param depth - 剩余深度
 * @param out - 输出列表
 * @returns {void}
 */
function walkCollect(
  root: string,
  relativeDir: string,
  depth: number,
  out: string[],
): void {
  if (out.length >= MAX_WALK_FILES || depth < 0) {
    return;
  }
  const absDir = relativeDir ? path.join(root, relativeDir) : root;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !SKIP_DIR_NAMES.has(name) && !name.startsWith('.'))
    .sort();

  for (const name of files) {
    if (out.length >= MAX_WALK_FILES) {
      return;
    }
    const rel = relativeDir ? path.join(relativeDir, name) : name;
    if (shouldSkipFile(rel)) {
      continue;
    }
    const ext = path.extname(name).toLowerCase();
    const interesting =
      [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.vue',
        '.py',
        '.go',
        '.rs',
        '.java',
        '.md',
        '.json',
        '.yml',
        '.yaml',
        '.toml',
      ].includes(ext) ||
      name === 'Dockerfile' ||
      name.startsWith('docker-compose');
    if (!interesting) {
      continue;
    }
    // 优先入口与路由类文件名
    const boost =
      /^(main|index|app|server|route|router|main\.ts|index\.ts)$/i.test(name) ||
      /routes?|controller|module/i.test(name);
    if (boost || out.length < MAX_WALK_FILES) {
      out.push(rel.replace(/\\/g, '/'));
    }
  }

  for (const name of dirs) {
    if (out.length >= MAX_WALK_FILES) {
      return;
    }
    const rel = relativeDir ? path.join(relativeDir, name) : name;
    walkCollect(root, rel, depth - 1, out);
  }
}

/**
 * 列出顶层目录名。
 *
 * @param root - 项目根
 * @returns 目录名
 */
function listTopDirs(root: string): string[] {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !SKIP_DIR_NAMES.has(name) && !name.startsWith('.'))
      .slice(0, 24);
  } catch {
    return [];
  }
}

/**
 * 采集供 DeepSeek 分析的仓库上下文文本。
 *
 * @param record - LabHub 项目登记
 * @returns 上下文字符串
 */
export function collectProjectAnalysisContext(record: ProjectRecord): string {
  const root = resolveProjectPath(record.path);
  const chunks: string[] = [];
  let total = 0;

  const push = (title: string, body: string) => {
    const block = `\n\n### ${title}\n\n${body}`;
    if (total + block.length > MAX_TOTAL_CHARS) {
      return false;
    }
    chunks.push(block);
    total += block.length;
    return true;
  };

  push(
    'LabHub 登记信息',
    JSON.stringify(
      {
        id: record.id,
        name: record.name,
        repoUrl: record.repoUrl,
        branch: record.branch,
        path: record.path,
        startCommand: record.startCommand,
        installCommand: record.installCommand,
        openUrl: record.openUrl,
        tags: record.tags,
        notes: record.notes,
        startProfiles: record.startProfiles,
        buildProfiles: record.buildProfiles,
        phases: record.phases,
        currentPhase: record.currentPhase,
      },
      null,
      2,
    ),
  );

  push('顶层目录', listTopDirs(root).map((name) => `- ${name}/`).join('\n') || '（空）');

  for (const name of PRIORITY_FILES) {
    const abs = path.join(root, name);
    const text = readTextSafe(abs);
    if (!text) {
      continue;
    }
    if (!push(name, text)) {
      break;
    }
  }

  // CI 工作流：最多 3 个
  const workflowsDir = path.join(root, '.github', 'workflows');
  if (fs.existsSync(workflowsDir)) {
    try {
      const workflows = fs
        .readdirSync(workflowsDir)
        .filter((name) => /\.(yml|yaml)$/i.test(name))
        .slice(0, 3);
      for (const name of workflows) {
        const text = readTextSafe(path.join(workflowsDir, name), 12_000);
        if (text && !push(`.github/workflows/${name}`, text)) {
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  // docs 下 md：最多 4 个（排除已有分析总结本身以免循环）
  const docsDir = path.join(root, 'docs');
  if (fs.existsSync(docsDir)) {
    try {
      const docs = fs
        .readdirSync(docsDir)
        .filter((name) => name.endsWith('.md') && name !== '项目分析总结.md')
        .slice(0, 4);
      for (const name of docs) {
        const text = readTextSafe(path.join(docsDir, name), 12_000);
        if (text && !push(`docs/${name}`, text)) {
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  const walked: string[] = [];
  walkCollect(root, '', 3, walked);
  const already = new Set(
    [...PRIORITY_FILES, ...walked.filter((item) => item.includes('项目分析总结'))].map((item) =>
      item.replace(/\\/g, '/'),
    ),
  );
  for (const rel of walked) {
    if (already.has(rel) || shouldSkipFile(rel)) {
      continue;
    }
    const text = readTextSafe(path.join(root, rel), 8_000);
    if (!text) {
      continue;
    }
    if (!push(rel, text)) {
      break;
    }
  }

  return `# 仓库证据材料\n\n分析根目录：\`${root}\`\n今日：${new Date().toISOString().slice(0, 10)}${chunks.join('')}`;
}
