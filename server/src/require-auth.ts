import type { NextFunction, Request, Response } from 'express';
import { getAuthToken, getCloudUrl } from './auth-store.js';

/**
 * 要求本机已登录 Cloud（存在 JWT）；未登录则 401。
 *
 * @param _req - 请求
 * @param res - 响应
 * @param next - 下一步
 * @returns {void}
 */
export function requireLocalLogin(_req: Request, res: Response, next: NextFunction): void {
  if (!getCloudUrl()) {
    res.status(503).json({ error: '未配置 Cloud 地址，无法使用管理系统' });
    return;
  }
  if (!getAuthToken()) {
    res.status(401).json({ error: '请先登录后再使用管理系统' });
    return;
  }
  next();
}
