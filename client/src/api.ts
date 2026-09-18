export type RuntimeStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export type LogLine = {
  ts: string;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
};

export type StartProfile = {
  id: string;
  name: string;
  command: string;
  openUrl?: string | null;
  cwd?: string | null;
  phase?: string | null;
  description?: string;
};

export type BuildProfile = {
  id: string;
  name: string;
  command: string;
  cwd?: string | null;
  description?: string;
};

export type CustomCommand = {
  id: string;
  name: string;
  command: string;
  cwd?: string | null;
};

export type ProjectPhase = {
  id: string;
  name: string;
  status: 'done' | 'current' | 'planned';
  summary: string;
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfileRuntimeView = {
  profile: StartProfile;
  runtime: {
    status: RuntimeStatus;
    pid: number | null;
    startedAt: string | null;
    exitedAt: string | null;
    exitCode: number | null;
    error: string | null;
    profileId?: string | null;
  };
  runtimeUrls: string[];
};

export type CustomCommandRuntimeView = {
  command: CustomCommand;
  runtime: {
    status: RuntimeStatus;
    pid: number | null;
    startedAt: string | null;
    exitedAt: string | null;
    exitCode: number | null;
    error: string | null;
    profileId?: string | null;
  };
};

export type Project = {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  path: string;
  absolutePath: string;
  startCommand: string;
  installCommand: string;
  openUrl: string | null;
  upstreamUrl: string | null;
  tags: string[];
  categoryId: string | null;
  notes: string;
  exists: boolean;
  isGitRepo: boolean;
  git: {
    branch: string | null;
    head: string | null;
    dirty: boolean;
    origin: string | null;
  } | null;
  runtime: {
    status: RuntimeStatus;
    pid: number | null;
    startedAt: string | null;
    exitedAt: string | null;
    exitCode: number | null;
    error: string | null;
    profileId?: string | null;
  };
  profileRuntimes: ProfileRuntimeView[];
  customCommandRuntimes: CustomCommandRuntimeView[];
  startProfiles: StartProfile[];
  buildProfiles: BuildProfile[];
  customCommands: CustomCommand[];
  defaultProfileId: string;
  defaultBuildProfileId: string;
  phases: ProjectPhase[];
  currentPhase: string | null;
  recentLogs: LogLine[];
  runtimeUrls: string[];
  hasAnalysis: boolean;
  depsInstalled: boolean;
  needsInstall: boolean;
};

/**
 * 带业务码的 API 错误。
 */
export class ApiError extends Error {
  code?: string;

  /**
   * @param message - 错误文案
   * @param code - 可选业务码
   */
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * 调用 LabHub API。
 *
 * @param path - 以 /api 开头的路径
 * @param init - fetch 选项
 * @returns 解析后的 JSON
 * @throws {ApiError} 非 2xx 或业务 error 字段
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  let data: (T & { error?: unknown; code?: string }) | null = null;
  if (raw) {
    try {
      data = JSON.parse(raw) as T & { error?: unknown; code?: string };
    } catch {
      if (!response.ok) {
        throw new ApiError(raw.slice(0, 200) || `请求失败 HTTP ${response.status}`);
      }
      throw new ApiError(`接口返回非 JSON（HTTP ${response.status}）：${raw.slice(0, 120)}`);
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data.error === 'string'
        ? data.error
        : raw.slice(0, 200) || `请求失败 HTTP ${response.status}`;
    throw new ApiError(message, typeof data?.code === 'string' ? data.code : undefined);
  }

  return (data ?? ({} as T)) as T;
}
