import fs from 'node:fs';
import path from 'node:path';
import {
  ANALYSIS_SKILL_OUTPUT_TEMPLATE,
  ANALYSIS_SKILL_SYSTEM_PROMPT,
} from './analysis-skill-prompt.js';
import { collectProjectAnalysisContext } from './analysis-context.js';
import {
  generateProjectAnalysis,
  writeAnalysisFile,
} from './analysis-generate.js';
import { hasProjectAnalysis } from './analysis.js';
import type { ProjectAnalysis } from './analysis.js';
import { getAuthToken, getCloudUrl } from './auth-store.js';
import { cloudAnalyze } from './cloud-client.js';
import type { ProjectRecord } from './types.js';
import { resolveProjectPath } from './store.js';

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

export type FirstManageAnalysisResult = {
  analysis: ProjectAnalysis;
  source: 'existing' | 'cloud' | 'deepseek-local' | 'heuristic';
  error?: string;
  hint?: string;
};

/**
 * @deprecated 使用 getCloudUrl
 */
export function getAnalysisRelayUrl(): string {
  return getCloudUrl();
}

/**
 * 读取本机 DeepSeek 配置（仅维护者调试备用）。
 *
 * @returns 配置
 */
export function getDeepSeekConfig(): {
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  return {
    apiKey: (process.env.DEEPSEEK_API_KEY ?? '').trim(),
    baseUrl: (process.env.DEEPSEEK_BASE_URL ?? DEFAULT_DEEPSEEK_BASE_URL).replace(/\/$/, ''),
    model: (process.env.DEEPSEEK_MODEL ?? DEFAULT_DEEPSEEK_MODEL).trim() || DEFAULT_DEEPSEEK_MODEL,
  };
}

/**
 * 去掉模型可能包裹的 markdown 代码围栏。
 *
 * @param content - 模型原文
 * @returns 纯 Markdown
 */
function unwrapMarkdownFence(content: string): string {
  const trimmed = content.trim();
  const matched = trimmed.match(/^```(?:markdown|md)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  return matched ? matched[1].trim() : trimmed;
}

/**
 * 本机直连 DeepSeek（维护者调试）。
 *
 * @param record - 项目
 * @param context - 证据
 * @returns Markdown
 */
export async function callLocalDeepSeek(
  record: ProjectRecord,
  context: string,
): Promise<string> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  if (!apiKey) {
    throw new Error('未配置 DEEPSEEK_API_KEY');
  }

  const userPrompt = `请根据下列仓库证据，按 skill 要求填写「项目分析总结」。

## 输出模板（按实情填实；无证据章节删除；第 3、4 节必留）

${ANALYSIS_SKILL_OUTPUT_TEMPLATE}

## 填写注意
- 项目显示名优先用登记 name：${record.name}（id=\`${record.id}\`）
- 分析根可用登记 path：\`${record.path.replace(/\\/g, '/')}\`
- 生成日期用今天的 UTC 日期
- 只输出最终 Markdown 文档正文

## 仓库证据

${context}
`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: ANALYSIS_SKILL_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}: ${raw.slice(0, 400)}`);
  }

  let parsed: { choices?: Array<{ message?: { content?: string } }> };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error(`DeepSeek 返回非 JSON：${raw.slice(0, 200)}`);
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error('DeepSeek 返回空内容');
  }

  const markdown = unwrapMarkdownFence(content);
  if (!markdown.includes('我能用这个项目做什么') || !markdown.includes('具体实施步骤')) {
    throw new Error('DeepSeek 输出缺少必填章节（能做什么 / 实施步骤）');
  }
  return markdown;
}

/**
 * 仅在项目「第一次被 LabHub 管理」时生成分析总结。
 *
 * 优先级：已有文档 → 已登录则 Cloud AI（扣配额）→ 本机 DEEPSEEK_API_KEY → 启发式。
 * 未登录不调 Cloud AI。
 *
 * @param record - 新建登记后的项目
 * @returns 分析结果与来源
 */
export async function generateAnalysisOnFirstManage(
  record: ProjectRecord,
): Promise<FirstManageAnalysisResult> {
  const root = resolveProjectPath(record.path);
  if (!fs.existsSync(root)) {
    throw new Error(`项目目录不存在：${root}`);
  }

  if (hasProjectAnalysis(record.path)) {
    return {
      analysis: generateProjectAnalysis(record, { force: false }),
      source: 'existing',
    };
  }

  const context = collectProjectAnalysisContext(record);
  const token = getAuthToken();
  const cloudUrl = getCloudUrl();

  if (token && cloudUrl) {
    try {
      const result = await cloudAnalyze(
        {
          id: record.id,
          name: record.name,
          path: record.path,
          repoUrl: record.repoUrl,
          branch: record.branch,
          startCommand: record.startCommand,
          installCommand: record.installCommand,
          openUrl: record.openUrl,
          tags: record.tags,
          notes: record.notes,
        },
        context,
      );
      const markdown = unwrapMarkdownFence(result.markdown);
      const analysis = writeAnalysisFile(record, markdown);
      console.log(`[labhub] Cloud AI 已为首次托管生成分析：${record.id}`);
      return { analysis, source: 'cloud' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = (error as { status?: number }).status;
      console.warn(`[labhub] Cloud AI 失败，回退：${record.id}`, message);
      if (status === 401) {
        const analysis = generateProjectAnalysis(record, { force: false });
        return {
          analysis,
          source: 'heuristic',
          error: message,
          hint: '登录已失效，请重新登录后添加项目以使用 AI 分析',
        };
      }
      if (status === 402) {
        const analysis = generateProjectAnalysis(record, { force: false });
        return {
          analysis,
          source: 'heuristic',
          error: message,
          hint: '本月 AI 分析次数已用完，已写入本地启发式总结',
        };
      }
      // fall through to local key / heuristic
      const { apiKey } = getDeepSeekConfig();
      if (apiKey) {
        try {
          const markdown = await callLocalDeepSeek(record, context);
          return {
            analysis: writeAnalysisFile(record, markdown),
            source: 'deepseek-local',
            error: message,
          };
        } catch (localError) {
          const localMessage =
            localError instanceof Error ? localError.message : String(localError);
          return {
            analysis: generateProjectAnalysis(record, { force: false }),
            source: 'heuristic',
            error: `${message}; ${localMessage}`,
          };
        }
      }
      return {
        analysis: generateProjectAnalysis(record, { force: false }),
        source: 'heuristic',
        error: message,
      };
    }
  }

  if (!token && cloudUrl) {
    const analysis = generateProjectAnalysis(record, { force: false });
    const { apiKey } = getDeepSeekConfig();
    if (apiKey) {
      try {
        const markdown = await callLocalDeepSeek(record, context);
        return {
          analysis: writeAnalysisFile(record, markdown),
          source: 'deepseek-local',
          hint: '未登录 Cloud；已用本机 Key。登录后可跨设备同步清单并使用配额内 AI',
        };
      } catch {
        return {
          analysis,
          source: 'heuristic',
          hint: '未登录 Cloud，已用本地启发式。登录后可使用 AI 分析与跨设备同步',
        };
      }
    }
    return {
      analysis,
      source: 'heuristic',
      hint: '未登录 Cloud，已用本地启发式。登录后可使用 AI 分析与跨设备同步',
    };
  }

  const { apiKey } = getDeepSeekConfig();
  if (apiKey) {
    try {
      const markdown = await callLocalDeepSeek(record, context);
      return {
        analysis: writeAnalysisFile(record, markdown),
        source: 'deepseek-local',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        analysis: generateProjectAnalysis(record, { force: false }),
        source: 'heuristic',
        error: message,
      };
    }
  }

  return {
    analysis: generateProjectAnalysis(record, { force: false }),
    source: 'heuristic',
  };
}
