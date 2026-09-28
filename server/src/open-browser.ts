import { spawn } from 'node:child_process';
import { pickPrimaryRuntimeUrl } from './log-urls.js';
import { findListeningUrl } from './process-probe.js';

/**
 * 用系统默认浏览器打开 URL。
 *
 * @param url - 要打开的地址
 * @returns {Promise<void>}
 */
export function openBrowser(url: string): Promise<void> {
  return new Promise((resolve) => {
    let command: string;
    let args: string[];
    if (process.platform === 'win32') {
      command = 'cmd';
      args = ['/c', 'start', '', url];
    } else if (process.platform === 'darwin') {
      command = 'open';
      args = [url];
    } else {
      command = 'xdg-open';
      args = [url];
    }
    const child = spawn(command, args, {
      stdio: 'ignore',
      windowsHide: true,
      detached: true,
    });
    child.unref();
    child.once('error', () => resolve());
    child.once('close', () => resolve());
  });
}

/**
 * 等待端口就绪后打开浏览器；超时则仍尝试打开一次。
 *
 * @param url - openUrl
 * @param timeoutMs - 最长等待毫秒
 * @returns {Promise<void>}
 */
export async function openBrowserWhenReady(
  url: string,
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await findListeningUrl([url]);
    if (ready) {
      await openBrowser(ready);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await openBrowser(url);
}

/**
 * 优先打开登记的 openUrl；若未配置再回退日志探测地址。
 * 多端 monorepo 日志里常出现多个 Local URL，盲目跟探测会打开错误端。
 *
 * @param options.getDetectedUrls - 拉取当前探测 URL
 * @param options.fallbackUrl - 登记地址
 * @param options.timeoutMs - 最长等待
 * @returns {Promise<void>}
 */
export async function openBrowserPreferDetected(options: {
  getDetectedUrls: () => string[];
  fallbackUrl?: string | null;
  timeoutMs?: number;
}): Promise<void> {
  const { getDetectedUrls, fallbackUrl = null, timeoutMs = 60_000 } = options;
  const deadline = Date.now() + timeoutMs;
  let lastPrimary: string | null = null;

  while (Date.now() < deadline) {
    if (fallbackUrl) {
      const readyFallback = await findListeningUrl([fallbackUrl]);
      if (readyFallback) {
        await openBrowser(readyFallback);
        return;
      }
    }

    const detected = getDetectedUrls();
    const primary = pickPrimaryRuntimeUrl(detected);
    if (primary) {
      lastPrimary = primary;
      // 已配置 openUrl 时，探测仅作后备，避免误开其它端
      if (!fallbackUrl) {
        const ready = await findListeningUrl([primary]);
        if (ready) {
          await openBrowser(ready);
          return;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const finalUrl = fallbackUrl || lastPrimary || pickPrimaryRuntimeUrl(getDetectedUrls());
  if (finalUrl) {
    await openBrowser(finalUrl);
  }
}
