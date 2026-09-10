import { spawn } from 'node:child_process';
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
