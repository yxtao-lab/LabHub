import fs from 'node:fs';
import path from 'node:path';
import type { BuildProfile, ProjectRecord, StartProfile } from './types.js';
import { DEFAULT_BUILD_PROFILE_ID, DEFAULT_PROFILE_ID } from './profiles.js';
import {
  inferProfilesFromPython,
  isPythonProject,
} from './python-profiles.js';

/** 从仓库清单推断出的启动 / 构建模式 */
export type InferredPackageProfiles = {
  startProfiles: StartProfile[];
  buildProfiles: BuildProfile[];
  defaultProfileId: string;
  defaultBuildProfileId: string;
  startCommand: string;
  installCommand: string;
  /** 生态类型 */
  kind: 'node' | 'python' | 'unknown';
  packageManager: 'pnpm' | 'yarn' | 'npm' | 'uv' | 'poetry' | 'pipenv' | 'pip' | 'unknown';
};

const START_SCRIPT_RE = /^(dev|start|serve|preview)(:.+)?$/i;
const BUILD_SCRIPT_RE = /^(build|package|bundle|compile|dist)(:.+)?$/i;

/** 排除的噪声脚本（虽匹配前缀但不作为模式） */
const EXCLUDED_SCRIPT_RE =
  /:(watch|test|check|typecheck|lint|analyze|size|report)$/i;

/**
 * 探测项目包管理器。
 *
 * @param root - 项目根目录
 * @returns 包管理器
 */
export function detectPackageManager(root: string): 'pnpm' | 'yarn' | 'npm' {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(root, 'yarn.lock'))) {
    return 'yarn';
  }
  return 'npm';
}

/**
 * 将 script 名转为稳定的 profile id。
 *
 * @param scriptName - 如 dev:web
 * @returns 如 dev-web
 */
function scriptToProfileId(scriptName: string): string {
  const raw = scriptName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/:/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return raw || DEFAULT_PROFILE_ID;
}

/**
 * 组装可执行命令。
 *
 * @param pm - 包管理器
 * @param scriptName - scripts 键名
 * @returns 命令字符串
 */
function runScriptCommand(pm: 'pnpm' | 'yarn' | 'npm', scriptName: string): string {
  if (pm === 'pnpm') {
    return `pnpm run ${scriptName}`;
  }
  if (pm === 'yarn') {
    return `yarn ${scriptName}`;
  }
  return `npm run ${scriptName}`;
}

/**
 * 为启动脚本生成展示名。
 *
 * @param scriptName - scripts 键名
 * @returns 中文友好名称
 */
function startDisplayName(scriptName: string): string {
  const key = scriptName.toLowerCase();
  const map: Record<string, string> = {
    dev: '默认（全量）',
    start: '默认启动',
    'dev:only': '仅核心',
    'dev:web': 'Web',
    'dev:admin': '管理后台',
    'dev:pc': 'PC',
    'dev:mobile': 'Mobile H5',
    'dev:server': 'Server',
    'dev:ai-service': 'AI 服务',
    'dev:route-solver': '路线求解',
    'dev:mp-weixin': '微信小程序',
    'dev:app': 'App',
    'dev:app-android': 'App Android',
    'dev:app-ios': 'App iOS',
    'dev:with-ai': '全量（含 AI）',
  };
  return map[key] ?? scriptName;
}

/**
 * 为构建脚本生成展示名。
 *
 * @param scriptName - scripts 键名
 * @returns 展示名
 */
function buildDisplayName(scriptName: string): string {
  const key = scriptName.toLowerCase();
  if (key === 'build') {
    return '默认构建';
  }
  return scriptName;
}

/**
 * 读取 package.json 的 scripts。
 *
 * @param root - 项目根
 * @returns scripts 键值；无文件则空对象
 */
function readPackageScripts(root: string): Record<string, string> {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {};
  }
  try {
    const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    return raw.scripts && typeof raw.scripts === 'object' ? raw.scripts : {};
  } catch {
    return {};
  }
}

/**
 * 合并旧配置中的 openUrl / cwd / phase / description（按 id 对齐）。
 *
 * @param inferred - 新推断列表
 * @param previous - 原清单列表
 * @returns 合并后的启动模式
 */
function mergeStartMeta(
  inferred: StartProfile[],
  previous: StartProfile[] | undefined,
): StartProfile[] {
  const prevById = new Map((previous ?? []).map((item) => [item.id, item]));
  return inferred.map((item) => {
    const old = prevById.get(item.id);
    if (!old) {
      return item;
    }
    return {
      ...item,
      openUrl: old.openUrl ?? item.openUrl ?? null,
      cwd: old.cwd ?? item.cwd ?? null,
      phase: old.phase ?? item.phase ?? null,
      description: old.description || item.description || '',
    };
  });
}

/**
 * 从项目根 package.json 推断启动 / 构建模式。
 *
 * @param root - 项目绝对路径
 * @param options.previous - 原登记（用于保留 openUrl 等）
 * @param options.openUrl - 默认访问地址（落到默认启动模式）
 * @returns 推断结果；无匹配脚本时 start/build 至少各留一条兜底
 */
export function inferProfilesFromPackageJson(
  root: string,
  options: {
    previous?: ProjectRecord | null;
    openUrl?: string | null;
  } = {},
): InferredPackageProfiles {
  const pm = detectPackageManager(root);
  const scripts = readPackageScripts(root);
  const names = Object.keys(scripts);

  const startNames = names.filter(
    (name) => START_SCRIPT_RE.test(name) && !EXCLUDED_SCRIPT_RE.test(name),
  );
  const buildNames = names.filter(
    (name) => BUILD_SCRIPT_RE.test(name) && !EXCLUDED_SCRIPT_RE.test(name),
  );

  // 排序：dev / build 优先，其余按字母
  const sortScripts = (list: string[], preferred: string) =>
    [...list].sort((a, b) => {
      if (a === preferred) return -1;
      if (b === preferred) return 1;
      return a.localeCompare(b);
    });

  const sortedStarts = sortScripts(startNames, 'dev');
  const sortedBuilds = sortScripts(buildNames, 'build');

  const preferredStart =
    sortedStarts.find((name) => name === 'dev') ??
    sortedStarts.find((name) => name === 'start') ??
    sortedStarts[0];

  let startProfiles: StartProfile[] = sortedStarts.map((scriptName) => {
    const isDefault = scriptName === preferredStart;
    return {
      id: isDefault ? DEFAULT_PROFILE_ID : scriptToProfileId(scriptName),
      name: startDisplayName(scriptName),
      command: runScriptCommand(pm, scriptName),
      openUrl: null,
      cwd: null,
      phase: null,
      description: scripts[scriptName] ? `package.json → ${scripts[scriptName]}` : '',
    };
  });

  let buildProfiles: BuildProfile[] = sortedBuilds.map((scriptName) => {
    const isDefault = scriptName === 'build';
    return {
      id: isDefault ? DEFAULT_BUILD_PROFILE_ID : scriptToProfileId(scriptName),
      name: buildDisplayName(scriptName),
      command: runScriptCommand(pm, scriptName),
      cwd: null,
      description: scripts[scriptName] ? `package.json → ${scripts[scriptName]}` : '',
    };
  });

  const openUrl = options.openUrl ?? options.previous?.openUrl ?? null;
  const installCommand =
    options.previous?.installCommand ||
    (pm === 'pnpm' ? 'pnpm install' : pm === 'yarn' ? 'yarn' : 'npm install');

  if (startProfiles.length === 0) {
    const command =
      options.previous?.startCommand ||
      (pm === 'pnpm' ? 'pnpm run dev' : pm === 'yarn' ? 'yarn dev' : 'npm run dev');
    startProfiles = [
      {
        id: DEFAULT_PROFILE_ID,
        name: '默认',
        command,
        openUrl,
        cwd: null,
        phase: null,
        description: '',
      },
    ];
  } else {
    startProfiles = mergeStartMeta(startProfiles, options.previous?.startProfiles);
    const defaultStart =
      startProfiles.find((item) => item.id === DEFAULT_PROFILE_ID) ?? startProfiles[0]!;
    if (!defaultStart.openUrl && openUrl) {
      defaultStart.openUrl = openUrl;
    }
  }

  if (buildProfiles.length === 0) {
    const command =
      pm === 'pnpm' ? 'pnpm run build' : pm === 'yarn' ? 'yarn build' : 'npm run build';
    buildProfiles = [
      {
        id: DEFAULT_BUILD_PROFILE_ID,
        name: '默认构建',
        command,
        cwd: null,
        description: '执行仓库默认 build 脚本',
      },
    ];
  }

  const defaultProfileId =
    startProfiles.find((item) => item.id === DEFAULT_PROFILE_ID)?.id ??
    startProfiles[0]!.id;
  const defaultBuildProfileId =
    buildProfiles.find((item) => item.id === DEFAULT_BUILD_PROFILE_ID)?.id ??
    buildProfiles[0]!.id;
  const startCommand =
    startProfiles.find((item) => item.id === defaultProfileId)?.command ??
    startProfiles[0]!.command;

  return {
    startProfiles,
    buildProfiles,
    defaultProfileId,
    defaultBuildProfileId,
    startCommand,
    installCommand,
    kind: 'node',
    packageManager: pm,
  };
}

/**
 * 按仓库类型推断启动 / 构建模式（Node 优先，其次 Python）。
 *
 * @param root - 项目绝对路径
 * @param options - 原登记与 openUrl
 * @returns 推断结果
 */
export function inferProjectProfiles(
  root: string,
  options: {
    previous?: ProjectRecord | null;
    openUrl?: string | null;
  } = {},
): InferredPackageProfiles {
  const hasPackageJson = fs.existsSync(path.join(root, 'package.json'));
  if (hasPackageJson) {
    return inferProfilesFromPackageJson(root, options);
  }
  if (isPythonProject(root)) {
    const inferred = inferProfilesFromPython(root, options);
    return {
      startProfiles: inferred.startProfiles,
      buildProfiles: inferred.buildProfiles,
      defaultProfileId: inferred.defaultProfileId,
      defaultBuildProfileId: inferred.defaultBuildProfileId,
      startCommand: inferred.startCommand,
      installCommand: inferred.installCommand,
      kind: 'python',
      packageManager: inferred.toolchain,
    };
  }
  const previous = options.previous;
  const startCommand = previous?.startCommand || 'npm run dev';
  const installCommand = previous?.installCommand || 'npm install';
  return {
    startProfiles: [
      {
        id: DEFAULT_PROFILE_ID,
        name: '默认',
        command: startCommand,
        openUrl: options.openUrl ?? previous?.openUrl ?? null,
        cwd: null,
        phase: null,
        description: '未识别到 Node/Python 清单，请手写启动命令',
      },
    ],
    buildProfiles: [
      {
        id: DEFAULT_BUILD_PROFILE_ID,
        name: '默认构建',
        command: previous?.buildProfiles?.[0]?.command || 'npm run build',
        cwd: null,
        description: '请按项目技术栈修改构建命令',
      },
    ],
    defaultProfileId: DEFAULT_PROFILE_ID,
    defaultBuildProfileId: DEFAULT_BUILD_PROFILE_ID,
    startCommand,
    installCommand,
    kind: 'unknown',
    packageManager: 'unknown',
  };
}

/**
 * 比较两套模式的命令集合是否一致。
 *
 * @param left - 左侧
 * @param right - 右侧
 * @returns 是否相同
 */
function sameCommandSet(
  left: Array<{ command: string }>,
  right: Array<{ command: string }>,
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const a = [...left.map((item) => item.command)].sort().join('\n');
  const b = [...right.map((item) => item.command)].sort().join('\n');
  return a === b;
}

/**
 * 保留清单中「非 package 推断」的自定义模式（按 command 去重追加）。
 *
 * @param inferred - 推断列表
 * @param previous - 原列表
 * @returns 合并后的列表
 */
function keepCustomProfiles<T extends { id: string; command: string }>(
  inferred: T[],
  previous: T[] | undefined,
): T[] {
  if (!previous?.length) {
    return inferred;
  }
  const commands = new Set(inferred.map((item) => item.command));
  const extras = previous.filter((item) => !commands.has(item.command));
  return extras.length ? [...inferred, ...extras] : inferred;
}

/**
 * 判断登记的启动/构建模式是否相对仓库清单不完整。
 *
 * @param record - 项目登记
 * @param root - 项目绝对路径
 * @returns 是否需要补全
 */
export function needsProfileRefresh(record: ProjectRecord, root: string): boolean {
  const hasNode = fs.existsSync(path.join(root, 'package.json'));
  const hasPython = isPythonProject(root);
  if (!hasNode && !hasPython) {
    return false;
  }
  const inferred = inferProjectProfiles(root, {
    previous: record,
    openUrl: record.openUrl,
  });
  // unknown 兜底且本来就是手写命令时不要反复覆盖
  if (inferred.kind === 'unknown') {
    return false;
  }
  const currentStarts = record.startProfiles?.length
    ? record.startProfiles
    : [{ command: record.startCommand }];
  const currentBuilds = record.buildProfiles?.length
    ? record.buildProfiles
    : [];
  if (inferred.startProfiles.length > currentStarts.length) {
    return true;
  }
  if (inferred.buildProfiles.length > currentBuilds.length) {
    return true;
  }
  if (!sameCommandSet(inferred.startProfiles, currentStarts)) {
    return true;
  }
  if (
    inferred.buildProfiles.length > 0 &&
    !sameCommandSet(inferred.buildProfiles, currentBuilds)
  ) {
    return true;
  }
  return false;
}

/**
 * 用仓库清单全面补全启动/构建模式（保留 openUrl 与自定义模式）。
 *
 * @param record - 原登记
 * @param root - 项目绝对路径
 * @returns 更新后的登记；无需变更时返回 null
 */
export function refreshRecordProfiles(
  record: ProjectRecord,
  root: string,
): ProjectRecord | null {
  if (!fs.existsSync(root)) {
    return null;
  }
  if (!needsProfileRefresh(record, root)) {
    return null;
  }
  const inferred = inferProjectProfiles(root, {
    previous: record,
    openUrl: record.openUrl,
  });
  const startProfiles = keepCustomProfiles(
    inferred.startProfiles,
    record.startProfiles,
  );
  const buildProfiles = keepCustomProfiles(
    inferred.buildProfiles,
    record.buildProfiles,
  );
  return {
    ...record,
    startCommand: inferred.startCommand,
    installCommand: record.installCommand || inferred.installCommand,
    startProfiles,
    buildProfiles,
    defaultProfileId: inferred.defaultProfileId,
    defaultBuildProfileId: inferred.defaultBuildProfileId,
    updatedAt: new Date().toISOString(),
  };
}
