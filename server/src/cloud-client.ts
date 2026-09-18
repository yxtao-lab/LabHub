import type { ProjectRecord } from './types.js';
import { clearAuthState, getAuthToken, getCloudUrl, saveAuthState } from './auth-store.js';

export type CloudAiQuota = {
  month: string;
  limit: number;
  used: number;
  remaining: number;
};

export type CloudMeUser = {
  id: string;
  phoneMasked: string;
  inviteCode?: string;
  projectLimit?: number;
  projectCount?: number;
  projectRemaining?: number;
  planId?: string;
  planName?: string;
  planExpiresAt?: string | null;
  plan?: Record<string, unknown>;
  aiBonus?: number;
  aiQuota: CloudAiQuota | null;
};

/** 可同步到云端的清单字段（不含本机 path / 运行态） */
export type CatalogProject = {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  startCommand: string;
  installCommand: string;
  openUrl: string | null;
  upstreamUrl: string | null;
  tags: string[];
  categoryId?: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  startProfiles?: ProjectRecord['startProfiles'];
  buildProfiles?: ProjectRecord['buildProfiles'];
  customCommands?: ProjectRecord['customCommands'];
  defaultProfileId?: string | null;
  defaultBuildProfileId?: string | null;
  phases?: ProjectRecord['phases'];
  currentPhase?: string | null;
};

/** 可同步到云端的分类 */
export type CatalogCategory = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CatalogPayload = {
  projects: CatalogProject[];
  categories: CatalogCategory[];
};

type AuthSuccess = {
  token: string;
  registered: boolean;
  user: CloudMeUser;
};

/**
 * 将本机项目记录转为云端清单项。
 *
 * @param record - 本机记录
 * @returns 清单项
 */
export function toCatalogProject(record: ProjectRecord): CatalogProject {
  return {
    id: record.id,
    name: record.name,
    repoUrl: record.repoUrl,
    branch: record.branch,
    startCommand: record.startCommand,
    installCommand: record.installCommand,
    openUrl: record.openUrl,
    upstreamUrl: record.upstreamUrl,
    tags: record.tags,
    categoryId: record.categoryId ?? null,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    startProfiles: record.startProfiles,
    buildProfiles: record.buildProfiles,
    customCommands: record.customCommands,
    defaultProfileId: record.defaultProfileId,
    defaultBuildProfileId: record.defaultBuildProfileId,
    phases: record.phases,
    currentPhase: record.currentPhase,
  };
}

/**
 * 调用 LabHub Cloud HTTP API。
 *
 * @param pathName - 路径
 * @param init - fetch 选项
 * @param token - 可选覆盖 token
 * @returns JSON
 */
export async function cloudFetch<T>(
  pathName: string,
  init?: RequestInit,
  token?: string | null,
): Promise<T> {
  const base = getCloudUrl();
  if (!base) {
    throw new Error('未配置 Cloud 地址（config/public.json 的 cloudUrl）');
  }
  const auth = token === undefined ? getAuthToken() : token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (auth) {
    headers.Authorization = `Bearer ${auth}`;
  }

  let response: Response;
  try {
    response = await fetch(`${base}${pathName}`, {
      ...init,
      headers,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(
      `无法连接 LabHub Cloud（${base}）：${detail}。请先启动 Cloud（默认 :8780），或暂时退出登录后再添加仓库`,
    ) as Error & { status?: number; code?: string };
    wrapped.code = 'CLOUD_UNREACHABLE';
    throw wrapped;
  }
  const raw = await response.text();
  let data: (T & { error?: unknown }) | null = null;
  if (raw) {
    try {
      data = JSON.parse(raw) as T & { error?: unknown };
    } catch {
      throw new Error(`Cloud 返回非 JSON（HTTP ${response.status}）：${raw.slice(0, 160)}`);
    }
  }
  if (!response.ok) {
    const message =
      data && typeof data.error === 'string'
        ? data.error
        : raw.slice(0, 200) || `Cloud HTTP ${response.status}`;
    const error = new Error(message) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return (data ?? ({} as T)) as T;
}

/**
 * 持久化登录成功结果。
 *
 * @param data - Cloud 返回
 * @returns 用户
 */
function persistAuth(data: AuthSuccess): CloudMeUser {
  saveAuthState({
    token: data.token,
    phoneMasked: data.user.phoneMasked,
    userId: data.user.id,
    updatedAt: new Date().toISOString(),
  });
  return data.user;
}

/**
 * 发送短信验证码。
 *
 * @param phone - 手机号
 * @returns {Promise<void>}
 */
export async function cloudSendSms(phone: string): Promise<void> {
  await cloudFetch(
    '/v1/auth/sms/send',
    {
      method: 'POST',
      body: JSON.stringify({ phone }),
    },
    null,
  );
}

/**
 * 手机号 + 密码登录。
 *
 * @param phone - 手机号
 * @param password - 密码
 * @returns 用户
 */
export async function cloudLoginPassword(
  phone: string,
  password: string,
): Promise<{ user: CloudMeUser; registered: boolean }> {
  const data = await cloudFetch<AuthSuccess>(
    '/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    },
    null,
  );
  return { user: persistAuth(data), registered: false };
}

/**
 * 手机号注册（短信 + 密码 + 可选邀请码）。
 *
 * @param input - 注册参数
 * @returns 用户
 */
export async function cloudRegister(input: {
  phone: string;
  password: string;
  code: string;
  inviteCode?: string;
}): Promise<{ user: CloudMeUser; registered: boolean }> {
  const data = await cloudFetch<AuthSuccess>(
    '/v1/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    null,
  );
  return { user: persistAuth(data), registered: true };
}

/**
 * 已注册用户短信验证码登录。
 *
 * @param phone - 手机号
 * @param code - 验证码
 * @returns 用户
 */
export async function cloudVerifySms(
  phone: string,
  code: string,
): Promise<{ user: CloudMeUser; registered: boolean }> {
  const data = await cloudFetch<AuthSuccess>(
    '/v1/auth/sms/verify',
    {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    },
    null,
  );
  return { user: persistAuth(data), registered: false };
}

/**
 * 拉取当前用户信息。
 *
 * @returns 用户或 null
 */
/**
 * 拉取当前登录用户；网络不可达时返回 null（不阻断本机登记）。
 *
 * @returns 用户信息；未登录或 Cloud 不可达时为 null
 */
export async function cloudFetchMe(): Promise<CloudMeUser | null> {
  const token = getAuthToken();
  if (!token) {
    return null;
  }
  try {
    const data = await cloudFetch<{ user: CloudMeUser }>('/v1/auth/me');
    return data.user;
  } catch (error) {
    const status = (error as { status?: number }).status;
    const code = (error as { code?: string }).code;
    if (status === 401) {
      clearAuthState();
      throw error;
    }
    // Cloud 宕机时勿阻断本机添加/列表；额度校验稍后云端恢复再对齐
    if (code === 'CLOUD_UNREACHABLE' || status == null) {
      console.warn(
        '[labhub] Cloud 暂不可达，跳过账号额度校验',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
    throw error;
  }
}

/**
 * 拉取云端清单。
 *
 * @returns 项目与分类
 */
export async function cloudGetCatalog(): Promise<CatalogPayload> {
  const data = await cloudFetch<{
    projects: CatalogProject[];
    categories?: CatalogCategory[];
  }>('/v1/catalog');
  return {
    projects: data.projects ?? [],
    categories: data.categories ?? [],
  };
}

/**
 * 覆盖推送本机清单到云端。
 *
 * @param payload - 项目与分类
 * @returns 云端回写列表
 */
export async function cloudPutCatalog(payload: CatalogPayload): Promise<CatalogPayload> {
  const data = await cloudFetch<{
    projects: CatalogProject[];
    categories?: CatalogCategory[];
  }>('/v1/catalog', {
    method: 'PUT',
    body: JSON.stringify({
      projects: payload.projects,
      categories: payload.categories,
    }),
  });
  return {
    projects: data.projects ?? [],
    categories: data.categories ?? [],
  };
}

/**
 * 带 JWT 请求 AI 分析。
 *
 * @param project - 项目元信息
 * @param context - 证据文本
 * @returns markdown 与配额
 */
export async function cloudAnalyze(
  project: Record<string, unknown>,
  context: string,
): Promise<{ markdown: string; aiQuota?: CloudAiQuota }> {
  return cloudFetch('/v1/analyze', {
    method: 'POST',
    body: JSON.stringify({ project, context }),
  });
}

/**
 * 拉取套餐目录。
 *
 * @returns 目录
 */
export async function cloudBillingCatalog(): Promise<{
  paymentMode: string;
  plans: unknown[];
  aiPack: unknown;
}> {
  return cloudFetch('/v1/billing/catalog', undefined, null);
}

/**
 * 创建计费订单。
 *
 * @param body - 下单参数
 * @returns 订单
 */
export async function cloudBillingCheckout(body: {
  kind: 'plan' | 'ai_pack';
  planId?: string;
  billingCycle?: 'monthly' | 'yearly';
}): Promise<{ order: unknown; paymentMode: string; canPayInApp: boolean }> {
  return cloudFetch('/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * 支付订单（mock 即时开通）。
 *
 * @param orderId - 订单 id
 * @returns 支付结果
 */
export async function cloudBillingPay(
  orderId: string,
): Promise<{ order: unknown; paymentMode: string; user: CloudMeUser }> {
  return cloudFetch(`/v1/billing/orders/${encodeURIComponent(orderId)}/pay`, {
    method: 'POST',
    body: '{}',
  });
}

/**
 * 切换到免费版。
 *
 * @returns 用户
 */
export async function cloudBillingSwitchFree(): Promise<{ user: CloudMeUser }> {
  return cloudFetch('/v1/billing/switch-free', {
    method: 'POST',
    body: '{}',
  });
}
