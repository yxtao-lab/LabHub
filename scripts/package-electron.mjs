/**
 * 打 Windows Electron 安装包。
 * 只包含桌面壳、打包后的本机服务和控制台页面，不包含 services/cloud 与仓库源码。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverOut = path.join(rootDir, 'release', 'app-resources', 'server');
const assistedInstallerPatch = path.join(rootDir, 'build', 'nsis', 'assistedInstaller.nsh');
const assistedInstallerTarget = path.join(
  rootDir,
  'node_modules',
  'app-builder-lib',
  'templates',
  'nsis',
  'assistedInstaller.nsh',
);

/**
 * 打印打包日志。
 *
 * @param message - 文案
 * @returns {void}
 */
function log(message) {
  console.log(`[package:electron] ${message}`);
}

/**
 * 执行命令，失败则抛错。
 *
 * @param command - 可执行文件
 * @param args - 参数
 * @returns {void}
 * @throws {Error} 非零退出码
 */
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} 退出码 ${result.status}`);
  }
}

/**
 * 覆盖 electron-builder 的目录清理逻辑：禁止给任意路径强制套一层应用名。
 *
 * @returns {void}
 * @throws {Error} 缺少补丁文件或目标模板时抛出
 */
function applyNsisDirectoryPatch() {
  if (!fs.existsSync(assistedInstallerPatch)) {
    throw new Error(`缺少 NSIS 补丁：${assistedInstallerPatch}`);
  }
  if (!fs.existsSync(assistedInstallerTarget)) {
    throw new Error(`缺少 electron-builder 模板：${assistedInstallerTarget}`);
  }
  fs.copyFileSync(assistedInstallerPatch, assistedInstallerTarget);
  log('已关闭「任意目录强制套一层应用名」');
}

/**
 * 打包入口。
 *
 * @returns {void}
 */
function main() {
  log('构建控制台与服务端类型检查');
  run('pnpm', ['run', 'build']);

  fs.rmSync(serverOut, { recursive: true, force: true });
  fs.mkdirSync(serverOut, { recursive: true });
  log('把本机服务打成单个文件');
  run('pnpm', [
    'dlx',
    'esbuild',
    'server/src/index.ts',
    '--bundle',
    '--platform=node',
    '--format=cjs',
    `--outfile=${serverOut.replace(/\\/g, '/')}/labhub.cjs`,
    '--packages=bundle',
  ]);

  const publicConfig = fs.readFileSync(path.join(rootDir, 'config', 'public.json'), 'utf8');
  if (/127\.0\.0\.1|localhost/i.test(publicConfig)) {
    log('注意：config/public.json 的 cloudUrl 仍指向本机。发给用户前请改成服务器上的 Cloud 地址后重新打包。');
  }

  applyNsisDirectoryPatch();

  log('生成 Electron 安装包');
  run('pnpm', [
    'exec',
    'electron-builder',
    '--win',
    'nsis',
    '--config',
    'electron-builder.yml',
    '--publish',
    'never',
  ]);
  log('安装包目录：release/electron');
  log('用户数据与浅克隆目录：%LOCALAPPDATA%\\LabHub');
}

try {
  main();
} catch (error) {
  console.error('[package:electron] 失败', error instanceof Error ? error.message : error);
  process.exit(1);
}
