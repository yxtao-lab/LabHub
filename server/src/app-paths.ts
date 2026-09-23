import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * 取得可用于加载 Node 内置模块的 require。
 * 开发态用当前模块 URL；打成 CJS / SEA 后没有 import.meta，改用 exe 路径。
 *
 * @returns CommonJS require
 */
function nodeRequire(): NodeRequire {
  try {
    const moduleUrl = import.meta.url;
    if (moduleUrl) {
      return createRequire(moduleUrl);
    }
  } catch {
    // esbuild 打成 CJS 时 import.meta 为空
  }
  return createRequire(pathToFileURL(process.execPath).href);
}

/**
 * 是否为安装包运行（Electron 设置 LABHUB_PACKAGED，或旧的单文件 SEA）。
 *
 * @returns 已打包时为 true
 */
export function isPackagedApp(): boolean {
  if (process.env.LABHUB_PACKAGED === '1') {
    return true;
  }
  try {
    const sea = nodeRequire()('node:sea') as { isSea?: () => boolean };
    return Boolean(sea.isSea?.());
  } catch {
    return false;
  }
}

/**
 * 开发态仓库根目录（server/src 或 server/dist 的上两级）。
 *
 * @returns 仓库根绝对路径
 */
function devRepoRoot(): string {
  try {
    const moduleUrl = import.meta.url;
    if (moduleUrl) {
      const serverDir = path.dirname(fileURLToPath(moduleUrl));
      return path.resolve(serverDir, '../..');
    }
  } catch {
    // 打包产物不走这条路径
  }
  return path.resolve(path.dirname(process.execPath), '../..');
}

/**
 * 安装目录：配置与控制台静态文件所在位置。
 * Electron 安装包通过 LABHUB_APP_ROOT 指向 resources；开发时为仓库根。
 *
 * @returns 应用资源根目录
 */
function resolveAppRoot(): string {
  const fromEnv = (process.env.LABHUB_APP_ROOT || '').trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  if (isPackagedApp()) {
    return path.dirname(process.execPath);
  }
  return devRepoRoot();
}

/** 配置与控制台静态文件所在目录 */
export const APP_ROOT = resolveAppRoot();

/**
 * 用户可写目录：清单、登录态与默认代码仓库。
 * 打包后由安装向导写入的 LABHUB_HOME（或注册表 / labhub-data-dir.txt）决定；
 * 未配置时回退 `%LOCALAPPDATA%\\LabHubData`。开发态为仓库根。
 *
 * @returns 用户数据根目录
 */
export function resolveUserRoot(): string {
  if (!isPackagedApp()) {
    return devRepoRoot();
  }
  const override = (process.env.LABHUB_HOME || '').trim();
  if (override) {
    return path.resolve(override);
  }
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'LabHubData');
}

/**
 * 安装目录（LabHub.exe 所在文件夹），仅程序文件。
 * Electron 通过 LABHUB_INSTALL_DIR 注入；打包兜底为 exe 所在目录。
 *
 * @returns 安装目录绝对路径
 */
export function resolveInstallDir(): string {
  const fromEnv = (process.env.LABHUB_INSTALL_DIR || '').trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  if (isPackagedApp()) {
    return path.dirname(process.execPath);
  }
  return resolveUserRoot();
}

/**
 * 默认代码托管目录：数据目录下的 projects（不在安装目录内）。
 * 可用 LABHUB_PROJECTS_DIR 覆盖。
 *
 * @returns projects 绝对路径
 */
export function resolveProjectsDir(): string {
  const fromEnv = (process.env.LABHUB_PROJECTS_DIR || '').trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.join(resolveUserRoot(), 'projects');
}

/** 清单 / 登录态 / 默认代码所在根（开发时等于仓库根） */
export const ROOT_DIR = resolveUserRoot();

/** 安装目录（开发时等于仓库根；打包后与 ROOT_DIR 分离） */
export const INSTALL_DIR = resolveInstallDir();

/** 默认浅克隆 / 恢复落地目录 */
export const PROJECTS_DIR = resolveProjectsDir();

/** 控制台静态资源目录 */
export const CLIENT_DIST_DIR = isPackagedApp()
  ? path.join(APP_ROOT, 'client')
  : path.join(APP_ROOT, 'client', 'dist');

/** 公开配置文件（cloudUrl 等） */
export const PUBLIC_CONFIG_PATH = path.join(APP_ROOT, 'config', 'public.json');
