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
  try {
    const configPath = path.join(ROOT_DIR, 'config', 'public.json');
    if (!fs.existsSync(configPath)) {
      return '';
    }
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      cloudUrl?: string;
      analysisRelayUrl?: string;
    };
    const url = (raw.cloudUrl || raw.analysisRelayUrl || '').trim();
    return url.replace(/\/$/, '');
  } catch {
    return '';
  }
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
