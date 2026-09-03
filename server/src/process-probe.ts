import net from 'node:net';

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
