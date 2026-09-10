import { execFile } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * 从 URL 中解析主机与端口。
 *
 * @param urlText - 形如 http://127.0.0.1:5173 的地址
 * @returns 主机与端口；无法解析时返回 null
 */
export function parseHostPort(urlText: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(urlText);
    const host = parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname;
    const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));
    if (!host || !Number.isFinite(port) || port <= 0) {
      return null;
    }
    return { host, port };
  } catch {
    return null;
  }
}

/**
 * 探测本机 TCP 端口是否有进程在监听。
 *
 * @param port - 端口号
 * @param host - 主机，默认 127.0.0.1
 * @param timeoutMs - 超时毫秒
 * @returns 是否可连接
 */
export function isPortOpen(port: number, host = '127.0.0.1', timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    let settled = false;

    /**
     * 结束探测并销毁套接字。
     *
     * @param result - 是否连通
     * @returns {void}
     */
    const finish = (result: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}

/**
 * 判断任一候选 URL 对应端口是否在监听。
 *
 * @param urls - 候选地址列表
 * @returns 第一个可连通的 URL；都不可通则 null
 */
export async function findListeningUrl(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    const target = parseHostPort(url);
    if (!target) {
      continue;
    }
    if (await isPortOpen(target.port, target.host)) {
      return url;
    }
  }
  return null;
}

/**
 * 查找占用指定端口的监听进程 PID（Windows netstat / Unix lsof）。
 *
 * @param port - 端口号
 * @returns PID 列表（去重）
 */
export async function findPidsByPort(port: number): Promise<number[]> {
  const pids = new Set<number>();
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp'], {
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
      });
      const needle = `:${port}`;
      for (const line of stdout.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line) || !line.includes(needle)) {
          continue;
        }
        const normalized = line.replace(/\s+/g, ' ').trim();
        const parts = normalized.split(' ');
        const local = parts[1] ?? '';
        // 避免 :3000 误匹配 :30001
        if (!local.endsWith(needle) && !local.includes(`]:${port}`)) {
          continue;
        }
        const pid = Number(parts[parts.length - 1]);
        if (Number.isInteger(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    } else {
      try {
        const { stdout } = await execFileAsync('lsof', [
          '-nP',
          `-iTCP:${port}`,
          '-sTCP:LISTEN',
          '-t',
        ]);
        for (const part of stdout.split(/\s+/)) {
          const pid = Number(part.trim());
          if (Number.isInteger(pid) && pid > 0) {
            pids.add(pid);
          }
        }
      } catch {
        // lsof 不可用时忽略
      }
    }
  } catch {
    // netstat/lsof 失败时返回已收集结果
  }
  return [...pids];
}

/**
 * 收集候选 URL 对应端口上的监听 PID。
 *
 * @param urls - openUrl 等候选地址
 * @returns PID 列表
 */
export async function findListeningPids(urls: string[]): Promise<number[]> {
  const pids = new Set<number>();
  const ports = new Set<number>();
  for (const url of urls) {
    const target = parseHostPort(url);
    if (target) {
      ports.add(target.port);
    }
  }
  for (const port of ports) {
    for (const pid of await findPidsByPort(port)) {
      pids.add(pid);
    }
  }
  return [...pids];
}

/**
 * 判断指定 PID 是否仍存活。
 *
 * @param pid - 进程 id
 * @returns 是否存活
 */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
