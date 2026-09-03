import fs from 'node:fs';
import path from 'node:path';
import { resolveProjectPath } from './store.js';

/** 托管项目内约定的分析文档相对路径 */
export const ANALYSIS_RELATIVE_PATH = path.join('docs', '项目分析总结.md');

export type ProjectAnalysis = {
  exists: boolean;
  relativePath: string;
  absolutePath: string;
  content: string | null;
  updatedAt: string | null;
  size: number | null;
};

/**
 * 解析项目分析文档的绝对路径。
 *
 * @param projectPath - 清单中的 path 字段
 * @returns 分析文档绝对路径
 */
export function resolveAnalysisPath(projectPath: string): string {
  return path.join(resolveProjectPath(projectPath), ANALYSIS_RELATIVE_PATH);
}

/**
 * 判断项目是否已有分析总结文档。
 *
 * @param projectPath - 清单中的 path 字段
 * @returns 文件是否存在
 */
export function hasProjectAnalysis(projectPath: string): boolean {
  return fs.existsSync(resolveAnalysisPath(projectPath));
}

/**
 * 读取项目分析总结 Markdown。
 *
 * @param projectPath - 清单中的 path 字段
 * @returns 分析文档视图
 */
export function readProjectAnalysis(projectPath: string): ProjectAnalysis {
  const absolutePath = resolveAnalysisPath(projectPath);
  const relativePath = ANALYSIS_RELATIVE_PATH.replace(/\\/g, '/');
  if (!fs.existsSync(absolutePath)) {
    return {
      exists: false,
      relativePath,
      absolutePath,
      content: null,
      updatedAt: null,
      size: null,
    };
  }
  const stat = fs.statSync(absolutePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  return {
    exists: true,
    relativePath,
    absolutePath,
    content,
    updatedAt: stat.mtime.toISOString(),
    size: stat.size,
  };
}
