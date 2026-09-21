/**
 * 发布 LabHub Cloud：安装依赖、编译、拉起 Postgres，并用 PM2 重启。
 * 每次都删除旧进程再启动，避免 PM2 缓存旧环境变量，`.env` 与代码改动都会生效。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cloudDir = path.join(rootDir, 'services', 'cloud');
const envPath = path.join(cloudDir, '.env');
const entryFile = path.join(cloudDir, 'dist', 'index.js');
const APP_NAME = 'labhub-cloud';

/**
 * 打印发布日志。
 *
 * @param message - 文案
 * @returns {void}
 */
function log(message) {
  console.log(`[release] ${message}`);
}

/**
 * 执行命令，失败则抛错。
 *
 * @param command - 可执行文件
 * @param args - 参数
 * @param cwd - 工作目录
 * @returns {void}
 * @throws {Error} 命令不存在或非零退出码
 */
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`无法执行 ${command}：${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} 退出码 ${result.status}`);
  }
}

/**
 * 判断 PM2 是否已经登记该应用（含已停止的进程）。
 *
 * @param name - PM2 进程名
 * @returns 已登记时为 true
 */
function pm2AppExists(name) {
  const result = spawnSync('pm2', ['describe', name], {
    stdio: 'ignore',
    shell: true,
    windowsHide: true,
  });
  return result.status === 0;
}

/**
 * 发布入口：编译 Cloud 并用干净进程重新拉起。
 *
 * @returns {void}
 * @throws {Error} 缺少 .env、编译失败或 PM2 失败
 */
function main() {
  if (!fs.existsSync(envPath)) {
    throw new Error('缺少 services/cloud/.env。请先复制 .env.example 并填好 JWT_SECRET、DATABASE_URL。');
  }

  log('安装依赖');
  run('pnpm', ['install'], rootDir);

  log('编译 Cloud');
  run('pnpm', ['--filter', '@labhub/cloud', 'build'], rootDir);
  if (!fs.existsSync(entryFile)) {
    throw new Error(`编译后找不到 ${entryFile}`);
  }

  log('确保 Postgres 已启动');
  run('docker', ['compose', 'up', '-d'], cloudDir);

  if (pm2AppExists(APP_NAME)) {
    log(`删除旧进程 ${APP_NAME}，以便重新读取 .env`);
    run('pm2', ['delete', APP_NAME], cloudDir);
  }

  log(`启动 ${APP_NAME}`);
  run(
    'pm2',
    ['start', entryFile, '--name', APP_NAME, '--cwd', cloudDir],
    cloudDir,
  );
  run('pm2', ['save'], cloudDir);
  log('已生效。查看日志：pm2 logs labhub-cloud');
  log('若重启机器后进程不在，在服务器上执行一次：pm2 startup');
}

try {
  main();
} catch (error) {
  console.error('[release] 失败', error instanceof Error ? error.message : error);
  process.exit(1);
}
