/**
 * 托管项目的持久化记录与运行态类型。
 */

/** 清单中的项目（落盘到 data/projects.json） */
export type ProjectRecord = {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  /** 相对 labhub 根目录，或绝对路径 */
  path: string;
  startCommand: string;
  installCommand: string;
  /** 控制台展示用的主访问地址（可选，日志也会自动探测） */
  openUrl: string | null;
  upstreamUrl: string | null;
  /** 分类标签，如「LLM」「边缘」「工具」 */
  tags: string[];
  createdAt: string;
  updatedAt: string;
  notes: string;
};

/** 进程运行态（内存） */
export type RuntimeStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export type RuntimeState = {
  status: RuntimeStatus;
  pid: number | null;
  startedAt: string | null;
  exitedAt: string | null;
  exitCode: number | null;
  error: string | null;
};

export type LogLine = {
  ts: string;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
};

export type ProjectView = ProjectRecord & {
  absolutePath: string;
  exists: boolean;
  isGitRepo: boolean;
  git: {
    branch: string | null;
    head: string | null;
    dirty: boolean;
    origin: string | null;
  } | null;
  runtime: RuntimeState;
  recentLogs: LogLine[];
  /** 从近期日志解析出的运行地址 */
  runtimeUrls: string[];
  /** 是否已有 docs/项目分析总结.md */
  hasAnalysis: boolean;
};
