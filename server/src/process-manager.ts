import { spawn, type ChildProcess } from 'node:child_process';
import {
  clearRuntime,
  getPersistedRuntime,
  upsertRuntime,
} from './runtime-store.js';
import { findListeningUrl, isProcessAlive } from './process-probe.js';
import type { LogLine, RuntimeState, RuntimeStatus } from './types.js';

const MAX_LOG_LINES = 500;

type ManagedProcess = {
  child: ChildProcess | null;
  runtime: RuntimeState;
  logs: LogLine[];
};

/**
 * 多项目进程管理器：启停、状态、环形日志缓冲。
 * 状态以真实 PID 存活与端口监听为准，并持久化到 data/runtime.json，避免服务重启后误判。
 */
export class ProcessManager {
  private readonly processes = new Map<string, ManagedProcess>();

  /**
   * 获取并校正项目运行态。
   *
   * @param projectId - 项目 id
   * @param probeUrls - 用于端口探测的候选地址（openUrl / 日志解析）
   * @returns 运行态快照
   */
  async getRuntime(projectId: string, probeUrls: string[] = []): Promise<RuntimeState> {
    await this.reconcile(projectId, probeUrls);
    return structuredClone(this.ensure(projectId).runtime);
  }

  /**
   * 获取最近日志。
   *
   * @param projectId - 项目 id
   * @param limit - 条数上限
   * @returns 日志行
   */
  getLogs(projectId: string, limit = 200): LogLine[] {
    const entry = this.ensure(projectId);
    return entry.logs.slice(-limit);
  }

  /**
   * 启动项目命令；已在运行则抛错。
   *
   * @param projectId - 项目 id
   * @param cwd - 工作目录
   * @param command - shell 命令行（如 npm run dev）
   * @param probeUrls - 启动前用于检测是否已在外部运行
   * @returns 启动后的运行态
   * @throws {Error} 已在运行或启动失败时抛出
   */
  async start(
    projectId: string,
    cwd: string,
    command: string,
    probeUrls: string[] = [],
  ): Promise<RuntimeState> {
    const current = await this.getRuntime(projectId, probeUrls);
    if (current.status === 'running' || current.status === 'starting') {
      throw new Error(`项目已在运行：${projectId}${current.pid ? `（pid ${current.pid}）` : ''}`);
    }

    const entry = this.ensure(projectId);
    this.appendLog(entry, 'system', `启动：${command}`);
    this.setStatus(entry, 'starting', { error: null, exitCode: null, exitedAt: null });

    const child = spawn(command, {
      cwd,
      env: process.env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: process.platform !== 'win32',
    });

    entry.child = child;
    entry.runtime.pid = child.pid ?? null;
    entry.runtime.startedAt = new Date().toISOString();
    this.setStatus(entry, 'running');

    if (child.pid) {
      upsertRuntime(projectId, {
        pid: child.pid,
        startedAt: entry.runtime.startedAt,
        command,
        cwd,
      });
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      this.appendLog(entry, 'stdout', chunk.toString());
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      this.appendLog(entry, 'stderr', chunk.toString());
    });
    child.on('error', (error) => {
      this.appendLog(entry, 'system', `进程错误：${error.message}`);
      this.setStatus(entry, 'error', { error: error.message, pid: null });
      entry.child = null;
      clearRuntime(projectId);
    });
    child.on('exit', (code, signal) => {
      // 子 shell 退出后，真实服务可能仍由后代进程占用端口，交由 reconcile 判定
      const message = signal
        ? `启动进程退出（信号 ${signal}）`
        : `启动进程退出，码=${code ?? 1}`;
      this.appendLog(entry, 'system', message);
      entry.runtime.exitCode = code;
      entry.child = null;
      void this.reconcile(projectId, probeUrls).then((state) => {
        if (state.status === 'running') {
          this.appendLog(entry, 'system', '启动 shell 已退出，但检测到服务仍在监听，保持运行中');
          return;
        }
        entry.runtime.exitedAt = new Date().toISOString();
        entry.runtime.pid = null;
        clearRuntime(projectId);
        this.setStatus(entry, code === 0 ? 'stopped' : 'error', {
          error: code === 0 ? null : message,
        });
      });
    });

    return this.getRuntime(projectId, probeUrls);
  }

  /**
   * 停止项目进程（优先杀托管 PID，再按持久化 PID / 端口占用清理）。
   *
   * @param projectId - 项目 id
   * @param probeUrls - 端口探测候选
   * @returns 停止后的运行态
   * @throws {Error} 未在运行时抛出
   */
  async stop(projectId: string, probeUrls: string[] = []): Promise<RuntimeState> {
    const entry = this.ensure(projectId);
    const before = await this.getRuntime(projectId, probeUrls);
    if (before.status === 'stopped') {
      throw new Error(`项目未在运行：${projectId}`);
    }

    this.setStatus(entry, 'stopping');
    this.appendLog(entry, 'system', '正在停止…');

    const pids = new Set<number>();
    if (entry.child?.pid) {
      pids.add(entry.child.pid);
    }
    if (entry.runtime.pid) {
      pids.add(entry.runtime.pid);
    }
    const persisted = getPersistedRuntime(projectId);
    if (persisted?.pid) {
      pids.add(persisted.pid);
    }

    for (const pid of pids) {
      await killProcessTree(pid);
    }

    await wait(900);
    entry.child = null;
    entry.runtime.pid = null;
    entry.runtime.exitedAt = new Date().toISOString();
    clearRuntime(projectId);

    const stillListening = await findListeningUrl(probeUrls);
    if (stillListening) {
      this.appendLog(
        entry,
        'system',
        `已结束托管进程，但仍检测到 ${stillListening} 在监听（可能是外部进程）`,
      );
      this.setStatus(entry, 'running', {
        error: `端口仍被占用：${stillListening}。请手动结束后再点停止，或更换端口`,
      });
      return this.getRuntime(projectId, probeUrls);
    }

    this.setStatus(entry, 'stopped', { error: null });
    this.appendLog(entry, 'system', '已停止');
    return this.getRuntime(projectId, probeUrls);
  }

  /**
   * 根据子进程句柄、持久化 PID、端口监听校正真实状态。
   *
   * @param projectId - 项目 id
   * @param probeUrls - 候选 URL
   * @returns 校正后的运行态
   */
  private async reconcile(projectId: string, probeUrls: string[]): Promise<RuntimeState> {
    const entry = this.ensure(projectId);

    if (entry.runtime.status === 'starting' || entry.runtime.status === 'stopping') {
      return entry.runtime;
    }

    const childPid = entry.child?.pid ?? null;
    if (childPid && isProcessAlive(childPid)) {
      this.setStatus(entry, 'running', { pid: childPid, error: null });
      return entry.runtime;
    }

    const persisted = getPersistedRuntime(projectId);
    if (persisted?.pid && isProcessAlive(persisted.pid)) {
      this.setStatus(entry, 'running', {
        pid: persisted.pid,
        startedAt: persisted.startedAt,
        error: null,
        exitedAt: null,
      });
      return entry.runtime;
    }

    if (persisted && (!persisted.pid || !isProcessAlive(persisted.pid))) {
      clearRuntime(projectId);
    }

    const listeningUrl = await findListeningUrl(probeUrls);
    if (listeningUrl) {
      this.setStatus(entry, 'running', {
        pid: entry.runtime.pid && isProcessAlive(entry.runtime.pid) ? entry.runtime.pid : null,
        error: null,
        exitedAt: null,
        startedAt: entry.runtime.startedAt ?? new Date().toISOString(),
      });
      if (!entry.logs.some((line) => line.text.includes(listeningUrl))) {
        this.appendLog(entry, 'system', `端口探测：${listeningUrl} 正在监听，标记为运行中`);
      }
      return entry.runtime;
    }

    if (entry.runtime.status === 'running' || entry.runtime.status === 'error') {
      entry.child = null;
      this.setStatus(entry, 'stopped', {
        pid: null,
        error: null,
        exitedAt: entry.runtime.exitedAt ?? new Date().toISOString(),
      });
    }

    return entry.runtime;
  }

  /**
   * 确保内部条目存在。
   *
   * @param projectId - 项目 id
   * @returns 托管条目
   */
  private ensure(projectId: string): ManagedProcess {
    let entry = this.processes.get(projectId);
    if (!entry) {
      entry = {
        child: null,
        runtime: {
          status: 'stopped',
          pid: null,
          startedAt: null,
          exitedAt: null,
          exitCode: null,
          error: null,
        },
        logs: [],
      };
      this.processes.set(projectId, entry);
    }
    return entry;
  }

  /**
   * 更新运行状态字段。
   *
   * @param entry - 托管条目
   * @param status - 新状态
   * @param patch - 可选字段覆盖
   * @returns {void}
   */
  private setStatus(
    entry: ManagedProcess,
    status: RuntimeStatus,
    patch: Partial<RuntimeState> = {},
  ): void {
    entry.runtime = { ...entry.runtime, ...patch, status };
  }

  /**
   * 追加日志；按行拆分并截断缓冲。
   *
   * @param entry - 托管条目
   * @param stream - 流类型
   * @param text - 原始文本
   * @returns {void}
   */
  private appendLog(entry: ManagedProcess, stream: LogLine['stream'], text: string): void {
    const ts = new Date().toISOString();
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    for (const line of lines) {
      if (!line) {
        continue;
      }
      entry.logs.push({ ts, stream, text: line });
    }
    if (entry.logs.length > MAX_LOG_LINES) {
      entry.logs = entry.logs.slice(-MAX_LOG_LINES);
    }
  }
}

/**
 * 结束进程树。
 *
 * @param pid - 根进程 pid
 * @returns {Promise<void>}
 */
async function killProcessTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('close', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // 已退出
    }
  }
}

/**
 * 等待指定毫秒。
 *
 * @param ms - 毫秒
 * @returns {Promise<void>}
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 全局单例 */
export const processManager = new ProcessManager();
