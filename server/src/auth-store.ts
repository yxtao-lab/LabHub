import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, ensureDirs, ROOT_DIR } from './store.js';

/** 本机登录态文件 */
export const AUTH_STORE_PATH = path.join(DATA_DIR, 'auth.json');

export type LocalAuthState = {
  token: string;
  phoneMasked: string;
  userId: string;
  updatedAt: string;
};

/** 控制台升级引导（来自 config/public.json，可公开） */
export type UpgradeOffer = {
  planName: string;
  priceMonthly: number;
  priceYearly: number;
  projectLimit: number;
  aiMonthly: number;
  aiPackPrice: number;
  aiPackQuota: number;
  contactWechat: string;
  contactNote: string;
  inviteHint: string;
};

const DEFAULT_UPGRADE_OFFER: UpgradeOffer = {
  planName: '基础版',
  priceMonthly: 39,
  priceYearly: 399,
  projectLimit: 10,
  aiMonthly: 20,
  aiPackPrice: 19,
  aiPackQuota: 50,
  contactWechat: '请替换为你的微信号',
  contactNote: '付款后发送注册手机号，一般当日开通额度',
  inviteHint: '也可邀请好友注册：双方项目管理额度各 +1（不替代付费升级）',
};

type PublicConfigFile = {
  cloudUrl?: string;
  analysisRelayUrl?: string;
  upgrade?: Partial<UpgradeOffer>;
};

/**
 * 读取 config/public.json（失败返回空对象）。
 *
 * @returns 配置对象
 */
function readPublicConfigFile(): PublicConfigFile {
  try {
    const configPath = path.join(ROOT_DIR, 'config', 'public.json');
    if (!fs.existsSync(configPath)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as PublicConfigFile;
  } catch {
    return {};
  }
}

/**
 * 读取公开 Cloud 根地址：环境变量优先，否则 config/public.json。
 *
 * @returns 无尾斜杠 URL；未配置则空串
 */
export function getCloudUrl(): string {
  const fromEnv = (process.env.LABHUB_CLOUD_URL ?? process.env.LABHUB_ANALYSIS_RELAY_URL ?? '').trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  const raw = readPublicConfigFile();
  const url = (raw.cloudUrl || raw.analysisRelayUrl || '').trim();
  return url.replace(/\/$/, '');
}

/**
 * 读取升级套餐文案（供控制台展示；可公开）。
 *
 * @returns 升级引导配置
 */
export function getUpgradeOffer(): UpgradeOffer {
  const raw = readPublicConfigFile().upgrade ?? {};
  return {
    planName: typeof raw.planName === 'string' && raw.planName.trim() ? raw.planName.trim() : DEFAULT_UPGRADE_OFFER.planName,
    priceMonthly:
      typeof raw.priceMonthly === 'number' && raw.priceMonthly > 0
        ? raw.priceMonthly
        : DEFAULT_UPGRADE_OFFER.priceMonthly,
    priceYearly:
      typeof raw.priceYearly === 'number' && raw.priceYearly > 0
        ? raw.priceYearly
        : DEFAULT_UPGRADE_OFFER.priceYearly,
    projectLimit:
      typeof raw.projectLimit === 'number' && raw.projectLimit > 0
        ? Math.floor(raw.projectLimit)
        : DEFAULT_UPGRADE_OFFER.projectLimit,
    aiMonthly:
      typeof raw.aiMonthly === 'number' && raw.aiMonthly > 0
        ? Math.floor(raw.aiMonthly)
        : DEFAULT_UPGRADE_OFFER.aiMonthly,
    aiPackPrice:
      typeof raw.aiPackPrice === 'number' && raw.aiPackPrice > 0
        ? raw.aiPackPrice
        : DEFAULT_UPGRADE_OFFER.aiPackPrice,
    aiPackQuota:
      typeof raw.aiPackQuota === 'number' && raw.aiPackQuota > 0
        ? Math.floor(raw.aiPackQuota)
        : DEFAULT_UPGRADE_OFFER.aiPackQuota,
    contactWechat:
      typeof raw.contactWechat === 'string' && raw.contactWechat.trim()
        ? raw.contactWechat.trim()
        : DEFAULT_UPGRADE_OFFER.contactWechat,
    contactNote:
      typeof raw.contactNote === 'string' && raw.contactNote.trim()
        ? raw.contactNote.trim()
        : DEFAULT_UPGRADE_OFFER.contactNote,
    inviteHint:
      typeof raw.inviteHint === 'string' && raw.inviteHint.trim()
        ? raw.inviteHint.trim()
        : DEFAULT_UPGRADE_OFFER.inviteHint,
  };
}

/**
 * 读取本机 JWT 登录态。
 *
 * @returns 登录态或 null
 */
export function loadAuthState(): LocalAuthState | null {
  ensureDirs();
  if (!fs.existsSync(AUTH_STORE_PATH)) {
    return null;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(AUTH_STORE_PATH, 'utf8')) as LocalAuthState;
    if (!raw?.token) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * 写入本机登录态。
 *
 * @param state - 登录态
 * @returns {void}
 */
export function saveAuthState(state: LocalAuthState): void {
  ensureDirs();
  fs.writeFileSync(AUTH_STORE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/**
 * 清除本机登录态。
 *
 * @returns {void}
 */
export function clearAuthState(): void {
  if (fs.existsSync(AUTH_STORE_PATH)) {
    fs.unlinkSync(AUTH_STORE_PATH);
  }
}

/**
 * 当前 Bearer Token（无登录则 null）。
 *
 * @returns token 或 null
 */
export function getAuthToken(): string | null {
  return loadAuthState()?.token ?? null;
}
