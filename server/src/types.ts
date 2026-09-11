/**
 * 托管项目的持久化记录与运行态类型。
 */

/** 单端 / 单场景启动模式 */
export type StartProfile = {
  id: string;
  name: string;
  /** shell 命令，相对 cwd 执行 */
  command: string;
  /** 该模式的主访问地址（端口探测候选） */
  openUrl?: string | null;
  /** 相对项目根的工作目录，空则用项目根 */
  cwd?: string | null;
  /** 归属分期，如 P0 / P1 / P2 */
  phase?: string | null;
  description?: string;
};

/** 构建目标（不同包 / 不同脚本） */
export type BuildProfile = {
  id: string;
  name: string;
  /** shell 命令，相对 cwd 执行 */
  command: string;
  /** 相对项目根的工作目录，空则用项目根 */
  cwd?: string | null;
  description?: string;
};

/** 项目研发分期 */
export type ProjectPhase = {
  id: string;
  name: string;
  status: 'done' | 'current' | 'planned';
  summary: string;
};

/** 侧栏分组用的项目分类 */
export type CategoryRecord = {
  id: string;
  name: string;
  /** 展示顺序，越小越靠前 */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** 清单中的项目（落盘到 data/projects.json） */
export type ProjectRecord = {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  /** 相对 labhub 根目录，或绝对路径 */
  path: string;
  /** 默认启动命令（与 defaultProfile 镜像，兼容旧清单） */
  startCommand: string;
  installCommand: string;
  /** 默认访问地址（与 defaultProfile 镜像） */
  openUrl: string | null;
  upstreamUrl: string | null;
  /** 分类标签，如「LLM」「边缘」「工具」 */
  tags: string[];
  /** 归属分类 id；null 表示未分类 */
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string;
  /** 多端 / 多场景启动模式；缺省由 startCommand 合成 */
  startProfiles?: StartProfile[];
  /** 构建目标列表；缺省由 package 管理器合成一条默认 build */
  buildProfiles?: BuildProfile[];
  /** 侧栏「启动」使用的默认模式 */
  defaultProfileId?: string | null;
  /** 默认构建目标 id */
  defaultBuildProfileId?: string | null;
  /** 研发分期说明 */
  phases?: ProjectPhase[];
  /** 当前所处分期 id，如 P2 */
  currentPhase?: string | null;
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
  /** 当前运行对应的启动模式 id（聚合态可为空） */
  profileId?: string | null;
};

export type LogLine = {
  ts: string;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
};

/** 单个启动模式的运行视图 */
export type ProfileRuntimeView = {
  profile: StartProfile;
  runtime: RuntimeState;
  runtimeUrls: string[];
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
  /** 聚合运行态：任一模式 running/starting 即视为运行中 */
  runtime: RuntimeState;
  /** 各启动模式运行态 */
  profileRuntimes: ProfileRuntimeView[];
  recentLogs: LogLine[];
  /** 从近期日志解析出的运行地址 */
  runtimeUrls: string[];
  /** 是否已有 docs/项目分析总结.md */
  hasAnalysis: boolean;
  /** 依赖是否已安装（无清单时视为 true） */
  depsInstalled: boolean;
  /** 是否需要先安装依赖才能启动 / 构建 */
  needsInstall: boolean;
  startProfiles: StartProfile[];
  buildProfiles: BuildProfile[];
  defaultProfileId: string;
  defaultBuildProfileId: string;
  phases: ProjectPhase[];
  currentPhase: string | null;
};
