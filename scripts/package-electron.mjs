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
const electronOutDir = path.join(rootDir, 'release', 'electron');
const winUnpackedDir = path.join(electronOutDir, 'win-unpacked');
const winUnpackedTmpDir = path.join(electronOutDir, 'win-unpacked.tmp');
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
 * 结束可能锁住 win-unpacked 的进程（LabHub / 本仓库 release 下的 electron / app-builder）。
 * 不会按进程名杀掉所有 Electron，避免误杀 Cursor。
 *
 * @returns {void}
 */
function killPackagingLockers() {
  if (process.platform !== 'win32') {
    return;
  }
  const marker = path.resolve(electronOutDir).replace(/\\/g, '\\\\').toLowerCase();
  const rootMarker = path.resolve(rootDir).replace(/\\/g, '\\\\').toLowerCase();
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$marker = '${marker}'
$rootMarker = '${rootMarker}'
$killed = @()
Get-CimInstance Win32_Process | ForEach-Object {
  $name = $_.Name
  $pathText = (($_.ExecutablePath + ' ' + $_.CommandLine) + '').ToLower().Replace('/', '\\')
  $isLabHub = $name -eq 'LabHub.exe'
  $isAppBuilder = $name -eq 'app-builder.exe' -and $pathText.Contains($rootMarker)
  $isReleaseElectron = ($name -eq 'electron.exe') -and $pathText.Contains($marker)
  if ($isLabHub -or $isAppBuilder -or $isReleaseElectron) {
    try {
      Stop-Process -Id $_.ProcessId -Force
      $killed += ("$name($($_.ProcessId))")
    } catch {}
  }
}
if ($killed.Count -gt 0) {
  Write-Output ('killed:' + ($killed -join ','))
} else {
  Write-Output 'killed:none'
}
`;
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      cwd: rootDir,
      encoding: 'utf8',
      windowsHide: true,
    },
  );
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (output) {
    log(output.startsWith('killed:') ? `已结束占用进程：${output.slice('killed:'.length)}` : output);
  }
  spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Start-Sleep -Milliseconds 1200'], {
    windowsHide: true,
  });
}

/**
 * 删除目录；若被占用则重试，仍失败则改名挪走，避免挡住本次打包。
 *
 * @param targetDir - 要清理的目录
 * @returns {void}
 * @throws {Error} 删除与改名都失败时抛出
 */
function removeDirForce(targetDir) {
  if (!fs.existsSync(targetDir)) {
    return;
  }
  const rel = path.relative(rootDir, targetDir);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      fs.rmSync(targetDir, { recursive: true, force: true });
      if (!fs.existsSync(targetDir)) {
        log(`已清理 ${rel}`);
        return;
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      log(`清理 ${rel} 第 ${attempt} 次失败：${detail}`);
    }
    spawnSync(
      'powershell.exe',
      ['-NoProfile', '-Command', `Start-Sleep -Milliseconds ${400 * attempt}`],
      { windowsHide: true },
    );
    killPackagingLockers();
  }

  const trashDir = `${targetDir}.trash-${Date.now()}`;
  try {
    fs.renameSync(targetDir, trashDir);
    log(`无法直接删除 ${rel}，已改名为 ${path.basename(trashDir)}（可稍后手动删）`);
    // 后台尽量删掉，失败忽略
    try {
      fs.rmSync(trashDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `无法清理 ${rel}（${detail}）。请关闭打开该目录的资源管理器，或暂时排除杀毒对 release\\electron 的实时扫描后重试。`,
    );
  }
}

/**
 * 删除上次打包残留的解压目录，避免 rename/unlink EPERM、EBUSY。
 *
 * @returns {void}
 */
function clearUnpackedDirs() {
  removeDirForce(winUnpackedDir);
  removeDirForce(winUnpackedTmpDir);
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

  log('结束可能占用安装产物的进程，并清理 win-unpacked');
  killPackagingLockers();
  clearUnpackedDirs();

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
