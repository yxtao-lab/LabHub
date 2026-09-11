import {
  ANALYSIS_SKILL_OUTPUT_TEMPLATE,
  ANALYSIS_SKILL_SYSTEM_PROMPT,
} from './skill-prompt.js';

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

export type AnalyzeProjectMeta = {
  id: string;
  name: string;
  path: string;
  repoUrl?: string;
  branch?: string;
  startCommand?: string;
  installCommand?: string;
  openUrl?: string | null;
  tags?: string[];
  notes?: string;
};

/**
 * 读取 DeepSeek 配置（仅中继进程使用，禁止下发到 LabHub 客户端仓）。
 *
 * @returns DeepSeek 配置
 * @throws {Error} 缺少 API Key
 */
export function requireDeepSeekConfig(): {
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const apiKey = (process.env.DEEPSEEK_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error('中继未配置 DEEPSEEK_API_KEY');
  }
  return {
    apiKey,
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
 * 调用 DeepSeek，按 project-analysis-summary skill 生成分析 Markdown。
 *
 * @param project - 项目元信息
 * @param context - LabHub 采集的仓库证据文本
 * @returns Markdown 正文
 */
export async function generateAnalysisMarkdown(
  project: AnalyzeProjectMeta,
  context: string,
): Promise<string> {
  const { apiKey, baseUrl, model } = requireDeepSeekConfig();

  const userPrompt = `请根据下列仓库证据，按 skill 要求填写「项目分析总结」。

## 输出模板（按实情填实；无证据章节删除；第 3、4 节必留）

${ANALYSIS_SKILL_OUTPUT_TEMPLATE}

## 填写注意
- 项目显示名优先用登记 name：${project.name}（id=\`${project.id}\`）
- 分析根可用登记 path：\`${project.path.replace(/\\/g, '/')}\`
- 「项目概览」必须含「远程仓库」行，优先填：\`${project.repoUrl ?? '未知'}\`
- 安装/启动/构建/测试命令以证据中的「已识别命令」为准（含 scriptCommands），不要照抄可能过时的 LabHub installCommand
- 生成日期用今天的 UTC 日期
- 只输出最终 Markdown 文档正文
- 文档说明中可写：由 LabHub 分析中继（DeepSeek）按 project-analysis-summary skill 在首次托管时生成

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
