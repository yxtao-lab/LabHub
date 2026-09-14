/**
 * 开发一体启动前置：补 Cloud .env、拉起 Postgres、等待就绪。
 * 由根目录 `npm run dev` / `pnpm dev` 调用。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cloudDir = path.join(rootDir, 'services', 'cloud');
const envPath = path.join(cloudDir, '.env');
const envExamplePath = path.join(cloudDir, '.env.example');
const composeFile = path.join(cloudDir, 'docker-compose.yml');
const pgHost = '127.0.0.1';
const pgPort = 5433;
const readyTimeoutMs = 60_000;

/**
 * 打印带前缀的日志。
 *
 * @param {string} message - 文案
 * @returns {void}
 */
function log(message) {
  console.log(`[dev:infra] ${message}`);
}

/**
 * 若缺少 Cloud .env 则从示例复制。
 *
 * @returns {void}
 */
function ensureCloudEnv() {
  if (fs.existsSync(envPath)) {
    log('已存在 services/cloud/.env');
    return;
  }
  if (!fs.existsSync(envExamplePath)) {
    throw new Error(`缺少 ${envExamplePath}，无法生成开发用 .env`);
  }
  fs.copyFileSync(envExamplePath, envPath);
  log('已从 .env.example 生成 services/cloud/.env（请勿提交）');
}

/**
 * 执行命令并等待结束。
 *
 * @param {string} command - 可执行文件
 * @param {string[]} args - 参数
 * @param {string} cwd - 工作目录
 * @returns {Promise<void>}
 */
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} 退出码 ${code}`));
    });
  });
}

/**
 * 探测 TCP 端口是否可连。
 *
 * @param {string} host - 主机
 * @param {number} port - 端口
 * @param {number} timeoutMs - 超时
 * @returns {Promise<boolean>}
 */
function canConnect(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    const finish = (ok) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}

/**
 * 等待 Postgres 端口就绪。
 *
 * @returns {Promise<void>}
 */
async function waitForPostgres() {
  const deadline = Date.now() + readyTimeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect(pgHost, pgPort)) {
      log(`Postgres 已就绪 ${pgHost}:${pgPort}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error(
    `等待 Postgres（${pgHost}:${pgPort}）超时。请确认 Docker Desktop 已启动，再重试 npm run / pnpm run dev`,
  );
}

/**
 * 拉起 Cloud 依赖的 Postgres 容器。
 *
 * @returns {Promise<void>}
 */
async function startPostgres() {
  if (!fs.existsSync(composeFile)) {
    throw new Error(`缺少 ${composeFile}`);
  }
  log('启动 Postgres（docker compose）…');
  try {
    await runCommand('docker', ['compose', '-f', composeFile, 'up', '-d'], cloudDir);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `无法启动 Postgres：${detail}。请安装并启动 Docker，然后重试。`,
    );
  }
}

/**
 * 入口。
 *
 * @returns {Promise<void>}
 */
async function main() {
  if (!fs.existsSync(cloudDir)) {
    throw new Error(`未找到 ${cloudDir}`);
  }
  ensureCloudEnv();
  await startPostgres();
  await waitForPostgres();
  log('基础设施就绪，接着启动 server / client / cloud');
}

main().catch((error) => {
  console.error(`[dev:infra] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
