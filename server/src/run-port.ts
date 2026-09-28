import type { StartProfile } from './types.js';

/** 合法端口范围 */
export const MIN_RUN_PORT = 1;
export const MAX_RUN_PORT = 65535;

export type AppliedRunPort = {
  /** 注入后的启动命令（可能附带 --port） */
  command: string;
  /** 探测 / 打开浏览器用的地址 */
  openUrl: string | null;
  /** 传给子进程的环境变量增量 */
  env: Record<string, string>;
  /** 端口探测候选 */
  probeUrls: string[];
};

/**
 * 校验并规范化端口号。
 *
 * @param value - 原始值（数字或字符串）
 * @returns 合法端口；无效时返回 null
 */
export function normalizeRunPort(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(num) || num < MIN_RUN_PORT || num > MAX_RUN_PORT) {
    return null;
  }
  return num;
}

/**
 * 把 URL 中的端口改成指定值；无端口时补上。
 * 非 http(s) 或解析失败时回退为 `http://127.0.0.1:port`。
 *
 * @param openUrl - 原登记地址
 * @param port - 目标端口
 * @returns 带新端口的 URL
 */
export function rewriteOpenUrlPort(openUrl: string | null | undefined, port: number): string {
  const fallback = `http://127.0.0.1:${port}`;
  const raw = (openUrl || '').trim();
  if (!raw) {
    return fallback;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return fallback;
    }
    url.port = String(port);
    let result = url.toString();
    if (url.pathname === '/' && !url.search && !url.hash) {
      result = result.replace(/\/$/, '');
    }
    return result;
  } catch {
    return fallback;
  }
}

/**
 * 在启动命令中写入 / 替换端口参数。
 * - 已有 `--port` / `-p`：替换数字
 * - npm/pnpm/yarn/bun run：追加 ` -- --port N`
 * - 直接 vite / 其它 CLI：追加 ` --port N`
 *
 * @param command - 原命令
 * @param port - 端口
 * @returns 改写后的命令
 */
export function injectPortIntoCommand(command: string, port: number): string {
  const trimmed = command.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/(?:^|\s)(?:--port|-p)\s+\d+/i.test(trimmed)) {
    return trimmed.replace(/(?:--port|-p)\s+\d+/i, `--port ${port}`);
  }
  if (/(?:^|[\s&;|])(?:npm|pnpm|yarn|bun)(?:\.cmd)?\s+run\b/i.test(trimmed)) {
    return `${trimmed} -- --port ${port}`;
  }
  return `${trimmed} --port ${port}`;
}

/**
 * 按配置端口生成启动命令、环境变量与探测 URL。
 * 未配置端口时原样返回（仅用原 openUrl 作探测）。
 *
 * @param profile - 启动模式
 * @param overridePort - 本次启动临时端口（优先于 profile.runPort）
 * @returns 应用结果
 * @throws {Error} overridePort / runPort 非法时抛出
 */
export function applyRunPort(
  profile: StartProfile,
  overridePort?: number | null,
): AppliedRunPort {
  const hasOverride = overridePort !== undefined && overridePort !== null;
  const raw = hasOverride ? overridePort : (profile.runPort ?? null);
  if (raw === null || raw === undefined) {
    const openUrl = profile.openUrl ?? null;
    return {
      command: profile.command,
      openUrl,
      env: {},
      probeUrls: openUrl ? [openUrl] : [],
    };
  }
  const port = normalizeRunPort(raw);
  if (port === null) {
    throw new Error(`端口无效：${String(raw)}（须为 1–65535 的整数）`);
  }
  const openUrl = rewriteOpenUrlPort(profile.openUrl, port);
  return {
    command: injectPortIntoCommand(profile.command, port),
    openUrl,
    env: {
      PORT: String(port),
      VITE_PORT: String(port),
    },
    probeUrls: [openUrl],
  };
}

/**
 * 在更新 runPort 时同步 openUrl，便于探测与打开浏览器。
 *
 * @param profile - 原模式
 * @param runPort - 新端口；null 表示清除端口配置（保留原 openUrl）
 * @returns 更新后的字段片段
 */
export function syncProfilePortFields(
  profile: StartProfile,
  runPort: number | null,
): Pick<StartProfile, 'runPort' | 'openUrl'> {
  if (runPort === null) {
    return { runPort: null, openUrl: profile.openUrl ?? null };
  }
  return {
    runPort,
    openUrl: rewriteOpenUrlPort(profile.openUrl, runPort),
  };
}
