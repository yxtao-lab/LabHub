/**
 * LabHub Cloud 套餐定义（权限与定价）。
 * 金额单位：分（人民币）。
 */

export type PlanFeature = {
  key: string;
  label: string;
  /** 展示文案，或 true/false 表示有无 */
  value: string | boolean;
};

export type PlanDefinition = {
  id: string;
  name: string;
  description: string;
  /** 月付价格（分）；0 表示免费 */
  priceMonthlyFen: number;
  /** 年付价格（分） */
  priceYearlyFen: number;
  projectLimit: number;
  aiMonthly: number;
  features: PlanFeature[];
  highlighted?: boolean;
};

/** AI 加油包（一次性） */
export const AI_PACK = {
  id: 'ai_pack',
  name: 'AI 加油包',
  description: '额外增加本月可用的 AI 分析次数（计入奖励额度）',
  priceFen: 990,
  quota: 50,
} as const;

/**
 * 全部套餐（含免费版）。按档位从低到高。
 */
export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: 'free',
    name: '免费版',
    description: '个人试用：管理少量仓库，体验启停与基础 AI 分析。',
    priceMonthlyFen: 0,
    priceYearlyFen: 0,
    projectLimit: 3,
    aiMonthly: 5,
    features: [
      { key: 'projects', label: '托管项目数', value: '3 个' },
      { key: 'ai', label: 'AI 项目分析', value: '5 次/月' },
      { key: 'catalog', label: '云端清单同步', value: true },
      { key: 'profiles', label: '多端启动 / 构建模式', value: true },
      { key: 'logs', label: '运行日志监控', value: true },
      { key: 'invite', label: '邀请好友各 +1 额度', value: true },
      { key: 'support', label: '优先支持', value: false },
      { key: 'bonus_ai', label: '可购 AI 加油包', value: true },
    ],
  },
  {
    id: 'basic',
    name: '基础版',
    description: '适合独立开发者：更多项目位与更够用的 AI 次数。',
    priceMonthlyFen: 990,
    priceYearlyFen: 9900,
    projectLimit: 10,
    aiMonthly: 30,
    highlighted: true,
    features: [
      { key: 'projects', label: '托管项目数', value: '10 个' },
      { key: 'ai', label: 'AI 项目分析', value: '30 次/月' },
      { key: 'catalog', label: '云端清单同步', value: true },
      { key: 'profiles', label: '多端启动 / 构建模式', value: true },
      { key: 'logs', label: '运行日志监控', value: true },
      { key: 'invite', label: '邀请好友各 +1 额度', value: true },
      { key: 'support', label: '优先支持', value: false },
      { key: 'bonus_ai', label: '可购 AI 加油包', value: true },
    ],
  },
  {
    id: 'pro',
    name: '专业版',
    description: '适合小团队 / 多客户仓库：更高额度与优先支持。',
    priceMonthlyFen: 2900,
    priceYearlyFen: 28800,
    projectLimit: 30,
    aiMonthly: 100,
    features: [
      { key: 'projects', label: '托管项目数', value: '30 个' },
      { key: 'ai', label: 'AI 项目分析', value: '100 次/月' },
      { key: 'catalog', label: '云端清单同步', value: true },
      { key: 'profiles', label: '多端启动 / 构建模式', value: true },
      { key: 'logs', label: '运行日志监控', value: true },
      { key: 'invite', label: '邀请好友各 +1 额度', value: true },
      { key: 'support', label: '优先支持', value: true },
      { key: 'bonus_ai', label: '可购 AI 加油包', value: true },
    ],
  },
];

/**
 * 按 id 查找套餐。
 *
 * @param planId - 套餐 id
 * @returns 套餐；不存在则 null
 */
export function findPlan(planId: string): PlanDefinition | null {
  return PLAN_DEFINITIONS.find((item) => item.id === planId) ?? null;
}

/**
 * 免费套餐。
 *
 * @returns 免费版定义
 */
export function freePlan(): PlanDefinition {
  return PLAN_DEFINITIONS[0]!;
}

/**
 * 分转元展示（最多一位小数）。
 *
 * @param fen - 分
 * @returns 如 9.9 或 29
 */
export function fenToYuan(fen: number): number {
  return Math.round(fen) / 100;
}

/**
 * 对外 API 套餐视图。
 *
 * @param plan - 定义
 * @returns JSON 友好结构
 */
export function toPlanView(plan: PlanDefinition) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceMonthly: fenToYuan(plan.priceMonthlyFen),
    priceYearly: fenToYuan(plan.priceYearlyFen),
    priceMonthlyFen: plan.priceMonthlyFen,
    priceYearlyFen: plan.priceYearlyFen,
    projectLimit: plan.projectLimit,
    aiMonthly: plan.aiMonthly,
    features: plan.features,
    highlighted: Boolean(plan.highlighted),
    isFree: plan.priceMonthlyFen <= 0,
  };
}

/**
 * 加油包对外视图。
 *
 * @returns 加油包信息
 */
export function toAiPackView() {
  return {
    id: AI_PACK.id,
    name: AI_PACK.name,
    description: AI_PACK.description,
    price: fenToYuan(AI_PACK.priceFen),
    priceFen: AI_PACK.priceFen,
    quota: AI_PACK.quota,
  };
}
