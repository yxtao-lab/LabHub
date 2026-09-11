import fs from 'node:fs';
import path from 'node:path';
import {
  ANALYSIS_RELATIVE_PATH,
  hasProjectAnalysis,
  readProjectAnalysis,
  resolveAnalysisPath,
  type ProjectAnalysis,
} from './analysis.js';
import { resolveProjectPath } from './store.js';
import type { ProjectRecord } from './types.js';
import {
  buildScriptRunCommand,
  resolveAnalysisCommands,
  type AnalysisCommandSnapshot,
} from './package-profiles.js';

type PackageJson = {
  name?: string;
  description?: string;
  version?: string;
  private?: boolean;
  packageManager?: string;
  engines?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/**
 * 安全读取 UTF-8 文本；不存在或失败时返回 null。
 *
 * @param filePath - 绝对路径
 * @param maxChars - 最大字符数；超出截断
 * @returns 文本或 null
 */
function readTextSafe(filePath: string, maxChars = 80_000): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const text = fs.readFileSync(filePath, 'utf8');
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n…` : text;
  } catch {
    return null;
  }
}

/**
 * 解析 package.json。
 *
 * @param root - 项目根绝对路径
 * @returns 对象或 null
 */
function readPackageJson(root: string): PackageJson | null {
  const raw = readTextSafe(path.join(root, 'package.json'), 200_000);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

/**
 * 从依赖名猜测技术栈条目。
 *
 * @param pkg - package.json
 * @returns 栈描述列表
 */
function inferStack(pkg: PackageJson | null): string[] {
  if (!pkg) {
    return ['未知（未找到 package.json）'];
  }
  const deps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  const names = Object.keys(deps);
  const hits: string[] = [];
  const rules: Array<[RegExp | string, string]> = [
    ['vue', 'Vue'],
    ['react', 'React'],
    ['next', 'Next.js'],
    ['express', 'Express'],
    ['nestjs', 'NestJS'],
    ['@nestjs/core', 'NestJS'],
    ['vite', 'Vite'],
    ['tailwindcss', 'Tailwind CSS'],
    ['drizzle-orm', 'Drizzle ORM'],
    ['prisma', 'Prisma'],
    ['electron', 'Electron'],
    ['typescript', 'TypeScript'],
  ];
  for (const [needle, label] of rules) {
    const matched =
      typeof needle === 'string'
        ? names.some((name) => name === needle || name.includes(needle))
        : names.some((name) => needle.test(name));
    if (matched && !hits.includes(label)) {
      hits.push(label);
    }
  }
  if (pkg.packageManager?.startsWith('pnpm')) {
    hits.unshift('pnpm');
  } else if (pkg.packageManager?.startsWith('yarn')) {
    hits.unshift('yarn');
  } else if (pkg.packageManager?.startsWith('bun')) {
    hits.unshift('bun');
  }
  return hits.length > 0 ? hits : ['Node.js 生态（依据 package.json）'];
}

/**
 * 列出根目录一级子目录（过滤常见无关项）。
 *
 * @param root - 项目根
 * @returns 目录名列表
 */
function listTopDirs(root: string): string[] {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(
        (name) =>
          !name.startsWith('.') &&
          !['node_modules', 'dist', 'build', 'coverage', '.git'].includes(name),
      )
      .slice(0, 16);
  } catch {
    return [];
  }
}

/**
 * 从 .env.example 抽取变量名（不含值）。
 *
 * @param root - 项目根
 * @returns 变量名列表
 */
function listEnvNames(root: string): string[] {
  const text =
    readTextSafe(path.join(root, '.env.example'), 40_000) ??
    readTextSafe(path.join(root, '.env.sample'), 40_000);
  if (!text) {
    return [];
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) {
      continue;
    }
    const key = match[1];
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    names.push(key);
    if (names.length >= 24) {
      break;
    }
  }
  return names;
}

/**
 * 挑选最有代表性的 npm scripts。
 *
 * @param scripts - scripts 映射
 * @returns 名称列表
 */
function pickScripts(scripts: Record<string, string> | undefined): string[] {
  if (!scripts) {
    return [];
  }
  const preferred = [
    'dev',
    'start',
    'build',
    'test',
    'lint',
    'bootstrap',
    'bootstrap:dev',
    'dev:server',
    'dev:web',
    'dev:api',
    'db:setup',
  ];
  const keys = Object.keys(scripts);
  const picked: string[] = [];
  for (const name of preferred) {
    if (keys.includes(name)) {
      picked.push(name);
    }
  }
  for (const name of keys) {
    if (picked.length >= 12) {
      break;
    }
    if (!picked.includes(name)) {
      picked.push(name);
    }
  }
  return picked;
}

/**
 * 从 README 抽取前几段纯文本摘要。
 *
 * @param readme - README 原文
 * @returns 摘要
 */
function summarizeReadme(readme: string | null): string {
  if (!readme) {
    return '仓库未提供 README，以下结论主要依据 package.json、目录与 LabHub 登记信息。';
  }
  const lines = readme
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('```') && !line.startsWith('|'));
  const joined = lines.slice(0, 8).join(' ').replace(/\s+/g, ' ').trim();
  return joined.slice(0, 280) || 'README 存在但难以自动摘要，请人工补充定位句。';
}

/**
 * 根据仓库证据与 LabHub 登记信息生成《项目分析总结》Markdown。
 *
 * @param record - 项目登记
 * @returns Markdown 正文
 */
export function buildAnalysisMarkdown(record: ProjectRecord): string {
  const root = resolveProjectPath(record.path);
  const pkg = readPackageJson(root);
  const readme =
    readTextSafe(path.join(root, 'README.md'), 60_000) ??
    readTextSafe(path.join(root, 'readme.md'), 60_000);
  const commands = resolveAnalysisCommands(root, record);
  const hasPnpmLock = fs.existsSync(path.join(root, 'pnpm-lock.yaml'));
  const hasNpmLock = fs.existsSync(path.join(root, 'package-lock.json'));
  const packageManager =
    pkg?.packageManager ||
    (commands.packageManager !== 'unknown' ? String(commands.packageManager) : hasPnpmLock ? 'pnpm' : hasNpmLock ? 'npm' : '未知');
  const installCmd = commands.installCommand;
  const startCmd = commands.startCommand;
  const scriptRunner =
    commands.packageManager === 'pnpm' ||
    commands.packageManager === 'yarn' ||
    commands.packageManager === 'npm' ||
    commands.packageManager === 'bun'
      ? commands.packageManager
      : hasPnpmLock
        ? 'pnpm'
        : 'npm';
  const openUrl = record.openUrl ?? '（未配置 openUrl）';
  const stack = inferStack(pkg);
  if (
    commands.packageManager !== 'unknown' &&
    !stack.includes(String(commands.packageManager))
  ) {
    stack.unshift(String(commands.packageManager));
  }
  const dirs = listTopDirs(root);
  const envNames = listEnvNames(root);
  const scripts = pickScripts(pkg?.scripts);
  const today = new Date().toISOString().slice(0, 10);
  const displayName = record.name || pkg?.name || record.id;
  const description = pkg?.description || summarizeReadme(readme);
  const profiles =
    commands.startProfiles.length > 0
      ? commands.startProfiles
      : [
          {
            id: 'default',
            name: '默认',
            command: startCmd,
            openUrl: record.openUrl,
            cwd: null,
            phase: null,
            description: '',
          },
        ];

  const scriptRows = scripts
    .map((name) => {
      const cmd = buildScriptRunCommand(scriptRunner, name);
      return `| \`${cmd}\` | \`${pkg?.scripts?.[name] ?? ''}\` |`;
    })
    .join('\n');
  const extraRows = commands.extraCommands
    .map((cmd) => `| \`${cmd}\` | 仓库清单推断 |`)
    .join('\n');
  const scriptTableRows = [scriptRows, extraRows].filter(Boolean).join('\n');

  const profileRows = profiles
    .map(
      (item) =>
        `| \`${item.id}\` | ${item.name} | \`${item.command}\` | ${item.openUrl ?? '—'} |`,
    )
    .join('\n');

  const dirRows = dirs.map((name) => `| \`${name}/\` | 见仓库说明 |`).join('\n');
  const envRows =
    envNames.length > 0
      ? envNames.map((name) => `| \`${name}\` | 见 \`.env.example\` | 视业务 |`).join('\n')
      : '| （未发现 `.env.example`） | — | — |';

  const tagLine = (record.tags ?? []).length ? (record.tags ?? []).join('、') : '无';
  const relPath = record.path.replace(/\\/g, '/');

  return `# ${displayName} · 项目分析总结

> 生成日期：${today}  
> 分析根目录：\`${relPath}\`（LabHub 托管）  
> 说明：由 LabHub **自动扫描** package.json / README / 目录与登记信息生成；细节请对照源码与官方文档复核。

## 1. 一句话定位

**${displayName}**（id=\`${record.id}\`）：${description}

## 2. 项目概览

| 项 | 内容 |
|---|---|
| 类型 | ${pkg?.workspaces ? 'Monorepo / Workspace' : '应用 / 库（据 package.json）'} |
| 主要语言 | TypeScript / JavaScript（据 Node 项目常见结构；以仓库为准） |
| 包管理器 | ${packageManager} |
| 安装依赖 | \`${installCmd}\` |
| 默认启动 | \`${startCmd}\` |
| 版本线索 | ${pkg?.version ?? '未知'} |
| LabHub 标签 | ${tagLine} |
| 默认分支 | ${record.branch} |
| 远程仓库 | ${record.repoUrl} |

${
  commands.catalogInstallMismatch
    ? `> 注意：LabHub 清单曾登记安装命令 \`${commands.catalogInstallCommand}\`，与仓库锁文件/包管理器不符；本文与控制台安装均以 \`${installCmd}\` 为准。\n`
    : ''
}
### 2.1 目标与范围

- 要解决的问题：${description}
- 明确不做的事：自动生成文档无法可靠推断；请查阅 README / ROADMAP。

### 2.2 使用者与场景

- 目标用户：本机开发与联调人员；通过 LabHub 统一启停与看日志。
- 典型使用场景：安装依赖 → 配置环境变量 → 用 LabHub 或命令行启动 → 打开 ${openUrl}。

## 3. 我能用这个项目做什么

| # | 我可以… | 得到的结果 | 依据 |
|---|---|---|---|
| 1 | 在 LabHub 中启动默认模式（\`${profiles[0]?.id ?? 'default'}\`） | 进程受控、可查看日志 | 登记 \`startCommand\` / \`startProfiles\` |
| 2 | 执行安装命令 \`${installCmd}\` | 依赖就绪 | 仓库锁文件 / 包管理器识别 |
| 3 | 按 README / scripts 做日常开发构建 | 本地可改代码并验证 | \`package.json\` scripts |
| 4 | 向 origin 提交推送 | 变更回到源仓库 | \`repoUrl\`=${record.repoUrl} |

### 3.1 适合谁用 / 不适合做什么

- 适合：已熟悉本仓技术栈、需要 LabHub 托管启停的开发者。
- 不适合：把本自动文档当作完整产品说明书；生产密钥与部署细则仍需人工核对。

### 3.2 与周边系统如何配合

- 托管于 LabHub：\`projects/${record.id}\`，控制台可分模式启停。
- 启动模式：

| id | 名称 | 命令 | openUrl |
|---|---|---|---|
${profileRows}

## 4. 具体实施步骤

### 场景 A：在 LabHub 下安装并启动

1. 前置：已安装 Node.js；LabHub API/控制台可用；本机网络可访问源仓库。
2. 进入目录并安装：
   \`\`\`bash
   cd ${relPath}
   ${installCmd}
   \`\`\`
3. 若存在 \`.env.example\`：复制为 \`.env\` 并填写必需变量（只改本地，勿提交密钥）。
4. 在 LabHub 控制台对该项目点击「启动」，或执行：
   \`\`\`bash
   ${startCmd}
   \`\`\`
5. 验证：打开 \`${openUrl}\`；或在控制台「日志」页确认无持续报错。

### 场景 B：同步远端并复核分析文档

1. 在 LabHub 对该项目执行「同步 origin」（或目录内 \`git pull\`）。
2. 若业务有重大变更，重新生成或手工更新 \`docs/项目分析总结.md\`。
3. 验证：控制台「分析总结」页签可渲染本文；\`hasAnalysis=true\`。

## 5. 技术栈

| 层级 | 选型 | 依据 |
|---|---|---|
| 工程 | ${stack.join('、')} | package.json / lockfile |
| 启动 | \`${startCmd}\` | package.json scripts / 识别结果 |
| 安装 | \`${installCmd}\` | ${commands.evidence.join('、') || '仓库清单'} |
| Node engines | ${pkg?.engines ? JSON.stringify(pkg.engines) : '未声明'} | package.json |

## 6. 架构与目录

### 6.1 顶层目录（自动枚举）

| 路径 | 职责 |
|---|---|
${dirRows || '| （无法枚举） | — |'}

## 7. 核心模块

| 模块 | 职责 | 关键路径 |
|---|---|---|
| LabHub 登记元数据 | 启停命令、标签、分期 | LabHub \`data/projects.json\` → \`${record.id}\` |
| 包清单 | 依赖与脚本 | \`package.json\` |
| 文档 | README / docs | \`README.md\`、\`docs/\` |

## 8. 入口与关键流程

**流程 A：LabHub 启停** — 控制台选择项目 → 启动模式 → \`process-manager\` 执行命令 → 日志面板。

**流程 B：本地开发** — \`${installCmd}\` → 配置 env → \`${startCmd}\` → 浏览器访问 \`${openUrl}\`。

## 9. 配置与运行

### 9.1 环境变量（仅名称）

| 变量名 | 用途 | 是否必需 |
|---|---|---|
${envRows}

### 9.2 常用脚本

| 命令 | 脚本内容 |
|---|---|
${scriptTableRows || '| （无 scripts） | — |'}

## 10. 风险与约定

- 本文由规则扫描生成，**不能替代**人工对安全、支付、密钥与生产部署的审查。
- 多项目并存时注意端口冲突（本项目 openUrl：\`${openUrl}\`）。
- 备注（登记）：${record.notes?.trim() || '无'}

## 11. 新人 30 分钟路径

1. \`cd ${relPath} && ${installCmd}\`
2. 如有 \`.env.example\` 则 \`cp .env.example .env\` 并填写最小必需项
3. 执行 \`${startCmd}\` 或在 LabHub 点击启动
4. 打开 \`${openUrl}\` 确认页面/健康检查可用
`;
}

/**
 * 确保「项目概览」含远程仓库地址（模型漏写时按 LabHub 登记补全）。
 *
 * @param markdown - 原始 Markdown
 * @param repoUrl - LabHub 登记的远程地址
 * @returns 补全后的 Markdown
 */
function ensureRemoteRepoInOverview(markdown: string, repoUrl: string): string {
  const url = repoUrl.trim();
  if (!url) {
    return markdown;
  }
  if (/\| 远程仓库 \|/.test(markdown)) {
    return markdown;
  }
  if (/\| 源仓库 \|/.test(markdown)) {
    return markdown.replace(/\| 源仓库 \|/, '| 远程仓库 |');
  }
  const afterPackageManager = markdown.replace(
    /(\| 包管理器 \|[^\n]*\n)/,
    `$1| 远程仓库 | ${url} |\n`,
  );
  if (afterPackageManager !== markdown) {
    return afterPackageManager;
  }
  return markdown.replace(
    /(## 2\.\s*项目概览\s*\n\s*\| 项 \| 内容 \|\s*\n\|[-| ]+\|\s*\n)/,
    `$1| 远程仓库 | ${url} |\n`,
  );
}

/**
 * 确保「项目概览」含安装/启动命令行（模型漏写时按识别结果补全）。
 *
 * @param markdown - 原始 Markdown
 * @param commands - 已识别命令
 * @returns 补全后的 Markdown
 */
function ensureCommandRowsInOverview(
  markdown: string,
  commands: AnalysisCommandSnapshot,
): string {
  let body = markdown;
  if (commands.installCommand && !/\| 安装依赖 \|/.test(body)) {
    const next = body.replace(
      /(\| 包管理器 \|[^\n]*\n)/,
      `$1| 安装依赖 | \`${commands.installCommand}\` |\n`,
    );
    body = next !== body ? next : body.replace(
      /(\| 远程仓库 \|[^\n]*\n)/,
      `| 安装依赖 | \`${commands.installCommand}\` |\n$1`,
    );
  }
  if (commands.startCommand && !/\| 默认启动 \|/.test(body)) {
    const anchor = /\| 安装依赖 \|/.test(body) ? /(\| 安装依赖 \|[^\n]*\n)/ : /(\| 包管理器 \|[^\n]*\n)/;
    body = body.replace(anchor, `$1| 默认启动 | \`${commands.startCommand}\` |\n`);
  }
  return body;
}

/**
 * 将文档中误写的 npm 安装/脚本命令改成仓库实际包管理器。
 * 含「曾登记」的说明行不改，以免把冲突提示改没。
 *
 * @param markdown - 原始 Markdown
 * @param commands - 已识别命令
 * @returns 纠正后的 Markdown
 */
function alignMarkdownCommands(
  markdown: string,
  commands: AnalysisCommandSnapshot,
): string {
  const pm = commands.packageManager;
  if (pm !== 'pnpm' && pm !== 'yarn' && pm !== 'bun') {
    return markdown;
  }
  return markdown
    .split('\n')
    .map((line) => {
      if (/曾登记|installCommand/.test(line)) {
        return line;
      }
      let next = line;
      if (pm === 'pnpm') {
        next = next.replace(/\bnpm ci\b/g, 'pnpm install --frozen-lockfile');
        next = next.replace(/\bnpm install\b/g, 'pnpm install');
        next = next.replace(/\bnpm run\b/g, 'pnpm run');
      } else if (pm === 'yarn') {
        next = next.replace(/\bnpm ci\b/g, 'yarn install --frozen-lockfile');
        next = next.replace(/\bnpm install\b/g, 'yarn');
        next = next.replace(/\bnpm run\s+(\S+)/g, 'yarn $1');
        next = next.replace(/\bnpm run\b/g, 'yarn');
      } else {
        next = next.replace(/\bnpm ci\b/g, 'bun install --frozen-lockfile');
        next = next.replace(/\bnpm install\b/g, 'bun install');
        next = next.replace(/\bnpm run\b/g, 'bun run');
      }
      return next;
    })
    .join('\n');
}

/**
 * 将分析 Markdown 写入约定路径（创建 docs/）。
 *
 * @param record - 项目登记
 * @param markdown - 正文
 * @returns 写入后的分析视图
 */
export function writeAnalysisFile(record: ProjectRecord, markdown: string): ProjectAnalysis {
  const absolutePath = resolveAnalysisPath(record.path);
  const root = resolveProjectPath(record.path);
  const commands = resolveAnalysisCommands(root, record);
  let body = ensureRemoteRepoInOverview(markdown, record.repoUrl);
  body = ensureCommandRowsInOverview(body, commands);
  body = alignMarkdownCommands(body, commands);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, body, 'utf8');
  return readProjectAnalysis(record.path);
}

/**
 * 为单个项目生成（或覆盖）分析总结。
 *
 * @param record - 项目登记
 * @param options.force - 已存在时是否覆盖；默认 false 则跳过
 * @returns 分析视图；目录不存在时抛错
 * @throws {Error} 项目目录不存在
 */
export function generateProjectAnalysis(
  record: ProjectRecord,
  options: { force?: boolean } = {},
): ProjectAnalysis {
  const root = resolveProjectPath(record.path);
  if (!fs.existsSync(root)) {
    throw new Error(`项目目录不存在：${root}`);
  }
  if (!options.force && hasProjectAnalysis(record.path)) {
    return readProjectAnalysis(record.path);
  }
  const markdown = buildAnalysisMarkdown(record);
  return writeAnalysisFile(record, markdown);
}

/**
 * 为清单中所有缺失分析文档的项目自动生成。
 *
 * @param projects - 项目列表
 * @returns 新生成的项目 id 列表
 */
export function ensureMissingAnalyses(projects: ProjectRecord[]): string[] {
  const generated: string[] = [];
  for (const record of projects) {
    const root = resolveProjectPath(record.path);
    if (!fs.existsSync(root)) {
      continue;
    }
    if (hasProjectAnalysis(record.path)) {
      continue;
    }
    try {
      generateProjectAnalysis(record, { force: false });
      generated.push(record.id);
    } catch {
      // 单个失败不影响其它项目
    }
  }
  return generated;
}

export { ANALYSIS_RELATIVE_PATH };
