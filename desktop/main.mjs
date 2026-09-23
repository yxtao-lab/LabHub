/**
 * LabHub 桌面壳：开发时打开 Vite；安装包内启动打包后的本机服务并打开窗口。
 * Cloud 不在此进程内，仍由 config/public.json 的 cloudUrl 指向服务器。
 */
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const desktopDir = path.dirname(fileURLToPath(import.meta.url));
const devConsoleUrl = 'http://127.0.0.1:5177/';
const apiPort = Number(process.env.PORT ?? 8790);
const apiOrigin = `http://127.0.0.1:${apiPort}`;

/** @type {BrowserWindow | null} */
let mainWindow = null;

/**
 * 判断当前是否为 electron-builder 打出的安装包。
 *
 * @returns 已打包时为 true
 */
function isPackagedRuntime() {
  return app.isPackaged;
}

/**
 * 安装包资源目录（client 与 config 所在位置）。
 *
 * @returns 绝对路径
 */
function packagedResourceRoot() {
  return process.resourcesPath;
}

/**
 * 用户数据目录：清单、登录态（卸载默认不删 AppData）。
 *
 * @returns 绝对路径
 */
function userDataRoot() {
  const base = process.env.LOCALAPPDATA || app.getPath('appData');
  return path.join(base, 'LabHub');
}

/**
 * 安装目录（LabHub.exe 所在目录）。
 *
 * @returns 绝对路径
 */
function installDir() {
  return path.dirname(app.getPath('exe'));
}

/**
 * 默认代码托管目录：安装目录下的 projects。
 *
 * @returns 绝对路径
 */
function projectsDir() {
  return path.join(installDir(), 'projects');
}

/**
 * 轮询直到本机页面或 API 可访问。
 *
 * @param url - 要探测的地址
 * @param timeoutMs - 超时毫秒
 * @returns {Promise<void>}
 * @throws {Error} 超时仍不可达
 */
async function waitForUrl(url, timeoutMs) {
  const started = Date.now();
  let lastError = '未连接';
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 400);
    });
  }
  throw new Error(`等待超时（${url}）：${lastError}`);
}

/**
 * 安装包模式：在本进程加载打包后的 Express 服务。
 *
 * @returns {Promise<void>}
 * @throws {Error} 缺少打包产物时抛出
 */
async function startBundledServer() {
  process.env.LABHUB_ELECTRON = '1';
  process.env.LABHUB_PACKAGED = '1';
  process.env.LABHUB_APP_ROOT = packagedResourceRoot();
  process.env.LABHUB_HOME = userDataRoot();
  process.env.LABHUB_INSTALL_DIR = installDir();
  process.env.LABHUB_PROJECTS_DIR = projectsDir();
  const bundlePath = path.join(packagedResourceRoot(), 'server', 'labhub.cjs');
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`缺少本机服务：${bundlePath}`);
  }
  await import(pathToFileURL(bundlePath).href);
  await waitForUrl(`${apiOrigin}/api/health`, 30_000);
}

/**
 * 创建主窗口并加载控制台。
 *
 * @param startUrl - 控制台地址
 * @returns {void}
 */
function createMainWindow(startUrl) {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'LabHub',
    icon: path.join(desktopDir, 'icon.ico'),
    backgroundColor: '#0b1016',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(desktopDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  void mainWindow.loadURL(startUrl);
}

/**
 * 弹出错误并退出。
 *
 * @param error - 启动失败原因
 * @returns {void}
 */
function failStartup(error) {
  const message = error instanceof Error ? error.message : String(error);
  dialog.showErrorBox('LabHub 无法启动', message);
  app.quit();
}

/**
 * 注册桌面 IPC（目录选择等）。
 *
 * @returns {void}
 */
function registerDesktopIpc() {
  ipcMain.handle('labhub:select-directory', async () => {
    const owner = BrowserWindow.getFocusedWindow() || mainWindow;
    const result = await dialog.showOpenDialog(owner ?? undefined, {
      title: '选择恢复位置',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    return result.filePaths[0];
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      registerDesktopIpc();
      if (isPackagedRuntime()) {
        await startBundledServer();
        createMainWindow(`${apiOrigin}/`);
        return;
      }
      process.env.LABHUB_ELECTRON = '1';
      await waitForUrl(devConsoleUrl, 90_000);
      createMainWindow(devConsoleUrl);
    } catch (error) {
      failStartup(error);
    }
  }).catch((error) => {
    failStartup(error);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
