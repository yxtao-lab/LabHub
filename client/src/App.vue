<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { marked } from 'marked';
import {
  api,
  ApiError,
  type LogLine,
  type Project,
  type ProjectPhase,
  type RuntimeStatus,
} from './api';

type DetailTab = 'logs' | 'analysis';
type UpgradeReason = 'project' | 'ai' | 'general';
type BillingCycle = 'monthly' | 'yearly';

type PlanFeature = {
  key: string;
  label: string;
  value: string | boolean;
};

type PlanView = {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  projectLimit: number;
  aiMonthly: number;
  features: PlanFeature[];
  highlighted?: boolean;
  isFree?: boolean;
};

type AiPackView = {
  id: string;
  name: string;
  description: string;
  price: number;
  quota: number;
};

type BillingCatalog = {
  paymentMode: string;
  plans: PlanView[];
  aiPack: AiPackView;
};

type ProjectAnalysis = {
  exists: boolean;
  relativePath: string;
  absolutePath: string;
  content: string | null;
  updatedAt: string | null;
  size: number | null;
};

const STATUS_LABEL: Record<RuntimeStatus, string> = {
  stopped: '已停止',
  starting: '启动中',
  running: '运行中',
  stopping: '停止中',
  error: '异常',
};

const STATUS_CLASS: Record<RuntimeStatus, string> = {
  stopped: 'bg-[#2a3441] text-[#8b9bb0]',
  starting: 'bg-[#3a3420] text-[var(--warn)]',
  running: 'bg-[#1e3a2a] text-[var(--ok)]',
  stopping: 'bg-[#3a3420] text-[var(--warn)]',
  error: 'bg-[#3a2220] text-[var(--danger)]',
};

const PHASE_CLASS: Record<ProjectPhase['status'], string> = {
  done: 'border-[var(--ok)]/35 bg-[var(--ok)]/10 text-[var(--ok)]',
  current: 'border-[var(--accent)]/45 bg-[var(--accent)]/15 text-[var(--accent)]',
  planned: 'border-[var(--line)] bg-[#0b1016] text-[var(--muted)]',
};

const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g;

const projects = ref<Project[]>([]);
const selectedId = ref<string | null>(null);
const logs = ref<LogLine[]>([]);
const logProfileId = ref<string | null>(null);
const buildProfileId = ref<string>('');
const error = ref<string | null>(null);
const busy = ref(false);
const showAdd = ref(false);
const showUpgrade = ref(false);
const upgradeReason = ref<UpgradeReason>('general');
const billingCatalog = ref<BillingCatalog | null>(null);
const billingCycle = ref<BillingCycle>('monthly');
const selectedPlanId = ref('basic');
const billingBusy = ref(false);
const billingMessage = ref<string | null>(null);
/** 开发环境预填的 Cloud 测试账号（与 services/cloud 启动种子一致） */
const DEV_TEST_PHONE = '13800138000';
const DEV_TEST_PASSWORD = 'labhub123';
const isDevClient = import.meta.env.DEV;

const authMode = ref<'login' | 'register'>('login');
const loginMethod = ref<'password' | 'sms'>('password');
const authPhone = ref(isDevClient ? DEV_TEST_PHONE : '');
const authPassword = ref(isDevClient ? DEV_TEST_PASSWORD : '');
const authPassword2 = ref('');
const authCode = ref('');
const authInvite = ref('');
const authAgreed = ref(isDevClient);
const smsCooldown = ref(0);
let smsTimer: number | undefined;

type CloudUser = {
  id: string;
  phoneMasked: string;
  inviteCode?: string;
  projectLimit?: number;
  projectCount?: number;
  projectRemaining?: number;
  planId?: string;
  planName?: string;
  planExpiresAt?: string | null;
  aiBonus?: number;
  aiQuota: {
    month: string;
    limit: number;
    used: number;
    remaining: number;
  } | null;
};

const cloudUrl = ref<string | null>(null);
const authUser = ref<CloudUser | null>(null);
const authLoggedIn = ref(false);
const authReady = ref(false);
const repoUrl = ref('');
const startCommand = ref('npm run dev');
const branch = ref('main');
const openUrl = ref('');
const upstreamUrl = ref('');
const tagsInput = ref('');
const tagsDraft = ref('');
/** 按项目名称下拉筛选：存项目 id；空字符串表示全部 */
const nameFilterId = ref('');
const logPanel = ref<HTMLElement | null>(null);
const detailTab = ref<DetailTab>('logs');
const analysis = ref<ProjectAnalysis | null>(null);
const analysisLoading = ref(false);
const analysisHtml = ref('');

const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 560;
const SIDEBAR_DEFAULT_WIDTH = 360;
const SIDEBAR_COLLAPSED_WIDTH = 52;
const SIDEBAR_WIDTH_KEY = 'labhub.sidebarWidth';
const SIDEBAR_COLLAPSED_KEY = 'labhub.sidebarCollapsed';
const DETAIL_META_COLLAPSED_KEY = 'labhub.detailMetaCollapsed';

const sidebarWidth = ref(loadSidebarWidth());
const sidebarCollapsed = ref(loadSidebarCollapsed());
const sidebarResizing = ref(false);
const detailMetaCollapsed = ref(loadDetailMetaCollapsed());

const selected = computed(
  () => projects.value.find((item) => item.id === selectedId.value) ?? null,
);

/**
 * 侧栏在桌面端的宽度样式（含收起态）。
 *
 * @returns CSS 变量与宽度对象
 */
const sidebarStyle = computed(() => {
  const width = sidebarCollapsed.value ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth.value;
  return {
    '--sidebar-w': `${width}px`,
  } as Record<string, string>;
});

/**
 * 从 localStorage 读取侧栏宽度，非法值回退默认。
 *
 * @returns 像素宽度
 */
function loadSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return SIDEBAR_DEFAULT_WIDTH;
    }
    // 旧默认 280/320 自动升到当前默认，避免本地缓存卡住偏窄宽度
    if (value === 280 || value === 320) {
      return SIDEBAR_DEFAULT_WIDTH;
    }
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(value)));
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

/**
 * 从 localStorage 读取详情概况是否收起；首次默认收起以放大控制台。
 *
 * @returns 是否收起
 */
function loadDetailMetaCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(DETAIL_META_COLLAPSED_KEY);
    if (raw === null) {
      return true;
    }
    return raw === '1';
  } catch {
    return true;
  }
}

/**
 * 切换详情页整块顶部（概况 / 启动模式 / 标签）收起状态并持久化。
 *
 * @returns {void}
 */
function toggleDetailMetaCollapsed(): void {
  detailMetaCollapsed.value = !detailMetaCollapsed.value;
  try {
    localStorage.setItem(DETAIL_META_COLLAPSED_KEY, detailMetaCollapsed.value ? '1' : '0');
  } catch {
    // 忽略存储失败
  }
}

/**
 * 从 localStorage 读取侧栏是否收起。
 *
 * @returns 是否收起
 */
function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * 切换侧栏收起/展开，并持久化。
 *
 * @returns {void}
 */
function toggleSidebarCollapsed(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0');
  } catch {
    // 忽略存储失败
  }
}

/**
 * 开始拖拽调节侧栏宽度。
 *
 * @param event - 鼠标按下事件
 * @returns {void}
 */
function startSidebarResize(event: MouseEvent): void {
  if (sidebarCollapsed.value) {
    return;
  }
  event.preventDefault();
  sidebarResizing.value = true;
  const startX = event.clientX;
  const startWidth = sidebarWidth.value;

  /**
   * 拖拽中更新宽度。
   *
   * @param moveEvent - 鼠标移动事件
   * @returns {void}
   */
  function onMove(moveEvent: MouseEvent): void {
    const next = Math.min(
      SIDEBAR_MAX_WIDTH,
      Math.max(SIDEBAR_MIN_WIDTH, Math.round(startWidth + (moveEvent.clientX - startX))),
    );
    sidebarWidth.value = next;
  }

  /**
   * 结束拖拽并持久化宽度。
   *
   * @returns {void}
   */
  function onUp(): void {
    sidebarResizing.value = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth.value));
    } catch {
      // 忽略存储失败
    }
  }

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

const runningCount = computed(
  () => projects.value.filter((item) => item.runtime.status === 'running').length,
);

const missingProjects = computed(() => projects.value.filter((item) => !item.exists));

const projectAtLimit = computed(() => {
  const limit = authUser.value?.projectLimit;
  if (limit == null) {
    return false;
  }
  const count = authUser.value?.projectCount ?? projects.value.length;
  return count >= limit;
});

const aiAtLimit = computed(() => {
  const quota = authUser.value?.aiQuota;
  return Boolean(quota && quota.remaining <= 0);
});

/**
 * 拉取套餐目录。
 *
 * @returns {Promise<void>}
 */
async function loadBillingCatalog(): Promise<void> {
  try {
    billingCatalog.value = await api<BillingCatalog>('/api/billing/catalog');
    if (!selectedPlanId.value || selectedPlanId.value === 'free') {
      const preferred =
        billingCatalog.value.plans.find((item) => item.highlighted)?.id ||
        billingCatalog.value.plans.find((item) => !item.isFree)?.id ||
        'basic';
      selectedPlanId.value = preferred;
    }
  } catch (err) {
    billingMessage.value = err instanceof Error ? err.message : String(err);
  }
}

/**
 * 打开升级 / 套餐管理弹窗。
 *
 * @param reason - 触发原因
 * @returns {void}
 */
function openUpgrade(reason: UpgradeReason = 'general'): void {
  upgradeReason.value = reason;
  billingMessage.value = null;
  showUpgrade.value = true;
  showAdd.value = false;
  if (reason === 'ai') {
    selectedPlanId.value = 'ai_pack';
  } else if (authUser.value?.planId && authUser.value.planId !== 'free') {
    selectedPlanId.value = authUser.value.planId;
  }
  void loadBillingCatalog();
}

/**
 * 尝试打开添加仓库；已达额度则引导升级。
 *
 * @returns {void}
 */
function openAddProject(): void {
  if (projectAtLimit.value) {
    openUpgrade('project');
    return;
  }
  showAdd.value = true;
}

/**
 * 若错误为项目额度上限，打开升级弹窗。
 *
 * @param err - 捕获的错误
 * @returns 是否已处理为升级引导
 */
function maybeOpenUpgradeFromError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const code = err instanceof ApiError ? err.code : undefined;
  if (
    code === 'PROJECT_LIMIT' ||
    message.includes('项目管理上限') ||
    message.includes('已达项目管理')
  ) {
    openUpgrade('project');
    return true;
  }
  if (message.includes('AI 分析次数已用完') || message.includes('本月 AI')) {
    openUpgrade('ai');
    return true;
  }
  return false;
}

/**
 * 当前选中套餐价格文案。
 */
const selectedPlanPriceLabel = computed(() => {
  if (selectedPlanId.value === 'ai_pack') {
    const pack = billingCatalog.value?.aiPack;
    return pack ? `¥${pack.price}` : '';
  }
  const plan = billingCatalog.value?.plans.find((item) => item.id === selectedPlanId.value);
  if (!plan || plan.isFree) {
    return '免费';
  }
  return billingCycle.value === 'yearly'
    ? `¥${plan.priceYearly}/年`
    : `¥${plan.priceMonthly}/月`;
});

/**
 * 系统内下单并支付开通。
 *
 * @returns {Promise<void>}
 */
async function checkoutAndPay(): Promise<void> {
  billingBusy.value = true;
  billingMessage.value = null;
  try {
    const kind = selectedPlanId.value === 'ai_pack' ? 'ai_pack' : 'plan';
    const checkout = await api<{
      order: { id: string };
      canPayInApp: boolean;
      paymentMode: string;
    }>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        kind,
        planId: kind === 'plan' ? selectedPlanId.value : undefined,
        billingCycle: billingCycle.value,
      }),
    });
    if (!checkout.canPayInApp && checkout.paymentMode === 'live') {
      billingMessage.value = '正式支付渠道尚未接入，请联系管理员或将 Cloud 设为 mock 支付。';
      return;
    }
    const paid = await api<{ user: CloudUser }>(
      `/api/billing/orders/${encodeURIComponent(checkout.order.id)}/pay`,
      { method: 'POST', body: '{}' },
    );
    authUser.value = paid.user;
    billingMessage.value = '支付成功，套餐已生效';
    await refreshAuth();
  } catch (err) {
    billingMessage.value = err instanceof Error ? err.message : String(err);
  } finally {
    billingBusy.value = false;
  }
}

/**
 * 降级到免费版。
 *
 * @returns {Promise<void>}
 */
async function switchToFree(): Promise<void> {
  if (!window.confirm('确认切换到免费版？项目超额时将无法继续添加，已有项目仍可管理。')) {
    return;
  }
  billingBusy.value = true;
  billingMessage.value = null;
  try {
    const data = await api<{ user: CloudUser }>('/api/billing/switch-free', {
      method: 'POST',
      body: '{}',
    });
    authUser.value = data.user;
    selectedPlanId.value = 'free';
    billingMessage.value = '已切换为免费版';
    await refreshAuth();
  } catch (err) {
    billingMessage.value = err instanceof Error ? err.message : String(err);
  } finally {
    billingBusy.value = false;
  }
}

/**
 * 刷新 Cloud 登录态。
 *
 * @returns {Promise<void>}
 */
async function refreshAuth(): Promise<void> {
  try {
    const data = await api<{
      cloudUrl: string | null;
      loggedIn: boolean;
      user: CloudUser | null;
    }>('/api/auth/status');
    cloudUrl.value = data.cloudUrl;
    authLoggedIn.value = data.loggedIn;
    authUser.value = data.user;
  } catch {
    authLoggedIn.value = false;
    authUser.value = null;
  } finally {
    authReady.value = true;
  }
}

/**
 * 登录成功后进入控制台。
 *
 * @param user - 用户
 * @returns {Promise<void>}
 */
async function enterAfterAuth(user: CloudUser): Promise<void> {
  authLoggedIn.value = true;
  authUser.value = user;
  authCode.value = '';
  authPassword.value = '';
  authPassword2.value = '';
  error.value = null;
  await refresh();
  await refreshAuth();
  if (projectsTimer === undefined) {
    projectsTimer = window.setInterval(() => void refresh(true), 3000);
  }
}

/**
 * 发送短信验证码。
 *
 * @returns {Promise<void>}
 */
async function sendSmsCode(): Promise<void> {
  await runAction(async () => {
    await api('/api/auth/sms/send', {
      method: 'POST',
      body: JSON.stringify({ phone: authPhone.value }),
    });
    smsCooldown.value = 60;
    if (smsTimer !== undefined) {
      window.clearInterval(smsTimer);
    }
    smsTimer = window.setInterval(() => {
      smsCooldown.value -= 1;
      if (smsCooldown.value <= 0 && smsTimer !== undefined) {
        window.clearInterval(smsTimer);
        smsTimer = undefined;
      }
    }, 1000);
  });
}

/**
 * 提交登录或注册。
 *
 * @returns {Promise<void>}
 */
async function submitAuth(): Promise<void> {
  await runAction(async () => {
    if (!authAgreed.value) {
      throw new Error('请先勾选同意服务条款和隐私协议');
    }
    if (authMode.value === 'register') {
      if (authPassword.value !== authPassword2.value) {
        throw new Error('两次输入的密码不一致');
      }
      const data = await api<{ user: CloudUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          phone: authPhone.value,
          password: authPassword.value,
          code: authCode.value,
          inviteCode: authInvite.value.trim() || undefined,
        }),
      });
      await enterAfterAuth(data.user);
      return;
    }

    if (loginMethod.value === 'password') {
      const data = await api<{ user: CloudUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          phone: authPhone.value,
          password: authPassword.value,
        }),
      });
      await enterAfterAuth(data.user);
      return;
    }

    const data = await api<{ user: CloudUser }>('/api/auth/sms/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: authPhone.value,
        code: authCode.value,
      }),
    });
    await enterAfterAuth(data.user);
  });
}

/**
 * 退出登录。
 *
 * @returns {Promise<void>}
 */
async function logout(): Promise<void> {
  await runAction(async () => {
    await api('/api/auth/logout', { method: 'POST', body: '{}' });
    authLoggedIn.value = false;
    authUser.value = null;
    projects.value = [];
    selectedId.value = null;
    authMode.value = 'login';
    loginMethod.value = 'password';
    if (isDevClient) {
      authPhone.value = DEV_TEST_PHONE;
      authPassword.value = DEV_TEST_PASSWORD;
      authAgreed.value = true;
    } else {
      authPhone.value = '';
      authPassword.value = '';
      authAgreed.value = false;
    }
    authPassword2.value = '';
    authCode.value = '';
    if (projectsTimer !== undefined) {
      window.clearInterval(projectsTimer);
      projectsTimer = undefined;
    }
  });
}

/**
 * 批量恢复本地缺失的托管目录。
 *
 * @returns {Promise<void>}
 */
async function restoreMissing(): Promise<void> {
  await runAction(async () => {
    const data = await api<{ restored: string[]; failed: Array<{ id: string; error: string }> }>(
      '/api/auth/restore-missing',
      { method: 'POST', body: '{}' },
    );
    await refresh();
    if (data.failed.length > 0) {
      error.value = `部分恢复失败：${data.failed.map((item) => `${item.id}(${item.error})`).join('；')}`;
    }
  });
}

/**
 * 恢复单个缺失项目。
 *
 * @param id - 项目 id
 * @returns {Promise<void>}
 */
async function restoreOne(id: string): Promise<void> {
  await runAction(async () => {
    await api(`/api/auth/restore/${id}`, { method: 'POST', body: '{}' });
    await refresh();
  });
}

const projectNameOptions = computed(() =>
  [...projects.value]
    .map((item) => ({ id: item.id, name: item.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
);

const filteredProjects = computed(() => {
  if (!nameFilterId.value) {
    return projects.value;
  }
  return projects.value.filter((item) => item.id === nameFilterId.value);
});

/**
 * 卡片上最多展示的标签数量，超出以省略号表示。
 */
const CARD_TAG_LIMIT = 3;

/**
 * 取卡片展示用标签（最多 3 个）及是否还有更多。
 *
 * @param tags - 项目标签列表
 * @returns 可见标签与是否省略
 */
function cardTags(tags: string[] | undefined): { visible: string[]; hasMore: boolean } {
  const list = tags ?? [];
  return {
    visible: list.slice(0, CARD_TAG_LIMIT),
    hasMore: list.length > CARD_TAG_LIMIT,
  };
}

/**
 * 名称下拉变更。
 *
 * @param event - change 事件
 * @returns {void}
 */
function onNameFilterChange(event: Event): void {
  nameFilterId.value = (event.target as HTMLSelectElement).value;
}

let projectsTimer: number | undefined;
let logsTimer: number | undefined;

/**
   * 刷新项目列表；首次无选中时默认选中第一项。
   *
   * @param silent - 为 true 时（轮询）不把瞬时错误顶到横幅
   * @returns {Promise<void>}
   */
async function refresh(silent = false): Promise<void> {
  try {
    const data = await api<{ projects: Project[] }>('/api/projects');
    projects.value = data.projects;
    error.value = null;
    if (!selectedId.value && data.projects[0]) {
      selectedId.value = data.projects[0].id;
    }
  } catch (err) {
    if (!silent) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  }
}

/**
 * 拉取指定项目的运行日志，并尽量滚到底部。
 *
 * @param id - 项目 id
 * @returns {Promise<void>}
 */
async function refreshLogs(id: string): Promise<void> {
  try {
    const query = new URLSearchParams({ limit: '300' });
    if (logProfileId.value) {
      query.set('profileId', logProfileId.value);
    }
    const data = await api<{ logs: LogLine[] }>(
      `/api/projects/${id}/logs?${query.toString()}`,
    );
    const nearBottom =
      !logPanel.value ||
      logPanel.value.scrollHeight - logPanel.value.scrollTop - logPanel.value.clientHeight < 80;
    logs.value = data.logs;
    if (nearBottom) {
      await nextTick();
      if (logPanel.value) {
        logPanel.value.scrollTop = logPanel.value.scrollHeight;
      }
    }
  } catch {
    // 轮询时忽略瞬时错误
  }
}

/**
 * 清空当前筛选范围下的运行日志缓冲（不影响进程）。
 *
 * @returns {Promise<void>}
 */
async function clearLogs(): Promise<void> {
  const id = selectedId.value;
  if (!id) {
    return;
  }
  await runAction(async () => {
    const query = new URLSearchParams();
    if (logProfileId.value) {
      query.set('profileId', logProfileId.value);
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    await api(`/api/projects/${id}/logs${suffix}`, { method: 'DELETE' });
    logs.value = [];
  });
}

/**
 * 拉取选中项目的分析总结，并渲染为 HTML。
 *
 * @param id - 项目 id
 * @returns {Promise<void>}
 */
async function refreshAnalysis(id: string): Promise<void> {
  analysisLoading.value = true;
  try {
    const data = await api<{ analysis: ProjectAnalysis; generated?: boolean }>(
      `/api/projects/${id}/analysis`,
    );
    analysis.value = data.analysis;
    if (data.analysis.exists && data.analysis.content) {
      analysisHtml.value = await marked.parse(data.analysis.content, { async: true });
    } else {
      analysisHtml.value = '';
    }
    if (data.generated) {
      await refresh(true);
    }
  } catch (err) {
    analysis.value = null;
    analysisHtml.value = '';
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    analysisLoading.value = false;
  }
}

/**
 * 用本地启发式强制重生成分析总结（不调用 DeepSeek；AI 仅在首次托管时触发）。
 *
 * @returns {Promise<void>}
 */
async function regenerateAnalysis(): Promise<void> {
  if (!selectedId.value) {
    return;
  }
  const id = selectedId.value;
  await runAction(async () => {
    await api(`/api/projects/${id}/analysis/generate`, { method: 'POST', body: '{}' });
  });
  detailTab.value = 'analysis';
  await refreshAnalysis(id);
}

/**
 * 包装异步操作并统一处理 busy / error。
 *
 * @param action - 异步任务
 * @returns {Promise<void>}
 */
async function runAction(action: () => Promise<void>): Promise<void> {
  busy.value = true;
  error.value = null;
  try {
    await action();
    await refresh();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    maybeOpenUpgradeFromError(err);
  } finally {
    busy.value = false;
  }
}

/**
 * 启动或停止指定项目（侧栏：默认模式启停；停止时停全部模式）。
 *
 * @param project - 项目视图
 * @param event - 点击事件（阻止冒泡选中）
 * @returns {Promise<void>}
 */
async function toggleProject(project: Project, event: MouseEvent): Promise<void> {
  event.stopPropagation();
  const running =
    project.runtime.status === 'running' || project.runtime.status === 'starting';
  await runAction(async () => {
    if (running) {
      await api(`/api/projects/${project.id}/stop`, { method: 'POST', body: '{}' });
      return;
    }
    await api(`/api/projects/${project.id}/start`, {
      method: 'POST',
      body: JSON.stringify({ profileId: project.defaultProfileId }),
    });
  });
}

/**
 * 启动或停止某一启动模式。
 *
 * @param profileId - 模式 id
 * @param running - 当前是否在跑
 * @returns {Promise<void>}
 */
async function toggleProfile(profileId: string, running: boolean): Promise<void> {
  if (!selected.value) {
    return;
  }
  const id = selected.value.id;
  logProfileId.value = profileId;
  await runAction(async () => {
    await api(`/api/projects/${id}/${running ? 'stop' : 'start'}`, {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    });
  });
  void refreshLogs(id);
}

/**
 * 执行项目的 installCommand（如 pnpm install）。
 *
 * @returns {Promise<void>}
 */
async function installSelected(): Promise<void> {
  if (!selected.value) {
    return;
  }
  const id = selected.value.id;
  logProfileId.value = null;
  detailTab.value = 'logs';
  await runAction(async () => {
    await api(`/api/projects/${id}/install`, { method: 'POST' });
  });
  void refreshLogs(id);
}

/**
 * 按所选构建目标执行 build。
 *
 * @param profileId - 可选构建目标 id；空则用当前下拉值 / 默认
 * @returns {Promise<void>}
 */
async function buildSelected(profileId?: string | null): Promise<void> {
  if (!selected.value) {
    return;
  }
  const id = selected.value.id;
  const targetId =
    profileId ||
    buildProfileId.value ||
    selected.value.defaultBuildProfileId ||
    selected.value.buildProfiles?.[0]?.id ||
    '';
  if (!targetId) {
    error.value = '没有可用的构建目标';
    return;
  }
  buildProfileId.value = targetId;
  logProfileId.value = `build:${targetId}`;
  detailTab.value = 'logs';
  await runAction(async () => {
    await api(`/api/projects/${id}/build`, {
      method: 'POST',
      body: JSON.stringify({ profileId: targetId }),
    });
  });
  void refreshLogs(id);
}

/**
 * 构建目标下拉变更。
 *
 * @param event - change 事件
 * @returns {void}
 */
function onBuildProfileChange(event: Event): void {
  buildProfileId.value = (event.target as HTMLSelectElement).value;
}

/**
 * 提交添加仓库表单。
 *
 * @param event - 表单提交事件
 * @returns {Promise<void>}
 */
async function submitAdd(event: Event): Promise<void> {
  event.preventDefault();
  await runAction(async () => {
    const data = await api<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        repoUrl: repoUrl.value,
        branch: branch.value,
        startCommand: startCommand.value,
        upstreamUrl: upstreamUrl.value || null,
        openUrl: openUrl.value || null,
        tags: tagsInput.value,
      }),
    });
    showAdd.value = false;
    repoUrl.value = '';
    openUrl.value = '';
    tagsInput.value = '';
    upstreamUrl.value = '';
    selectedId.value = data.project.id;
    await refreshAuth();
  });
}

/**
 * 同步选中项目的 origin。
 *
 * @returns {Promise<void>}
 */
async function syncSelected(): Promise<void> {
  if (!selected.value) {
    return;
  }
  const id = selected.value.id;
  await runAction(async () => {
    await api(`/api/projects/${id}/sync`, { method: 'POST' });
  });
}

/**
 * 从清单移除选中项目（默认不删磁盘）。
 *
 * @returns {Promise<void>}
 */
async function removeSelected(): Promise<void> {
  if (!selected.value) {
    return;
  }
  const id = selected.value.id;
  if (!window.confirm(`从清单移除 ${id}？（默认不删磁盘文件）`)) {
    return;
  }
  await runAction(async () => {
    await api(`/api/projects/${id}`, { method: 'DELETE' });
    selectedId.value = null;
  });
}

/**
 * 返回运行状态对应的样式 class。
 *
 * @param status - 运行状态
 * @returns Tailwind class 字符串
 */
function statusClass(status: RuntimeStatus): string {
  return STATUS_CLASS[status];
}

/**
 * 返回运行状态中文标签。
 *
 * @param status - 运行状态
 * @returns 展示文案
 */
function statusLabel(status: RuntimeStatus): string {
  return STATUS_LABEL[status];
}

/**
 * 返回操作按钮色调 class。
 *
 * @param tone - 按钮色调
 * @returns Tailwind class 字符串
 */
function toneClass(tone: 'default' | 'ok' | 'danger' = 'default'): string {
  if (tone === 'ok') {
    return 'border-[var(--ok)]/40 text-[var(--ok)] hover:bg-[var(--ok)]/10';
  }
  if (tone === 'danger') {
    return 'border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10';
  }
  return 'border-[var(--line)] text-[var(--text)] hover:bg-white/5';
}

/**
 * 保存当前选中项目的分类标签。
 *
 * @returns {Promise<void>}
 */
async function saveSelectedTags(): Promise<void> {
  if (!selected.value) {
    return;
  }
  const id = selected.value.id;
  await runAction(async () => {
    await api(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ tags: tagsDraft.value }),
    });
  });
}

/**
 * 选中项目并打开分析总结页签。
 *
 * @param projectId - 项目 id
 * @param event - 可选点击事件（阻止冒泡）
 * @returns {void}
 */
function openAnalysis(projectId: string, event?: Event): void {
  event?.stopPropagation();
  selectedId.value = projectId;
  detailTab.value = 'analysis';
  void refreshAnalysis(projectId);
}

/**
 * 返回日志行颜色 class。
 *
 * @param stream - 日志流类型
 * @returns Tailwind class 字符串
 */
function logClass(stream: LogLine['stream']): string {
  if (stream === 'stderr') {
    return 'text-[var(--danger)]';
  }
  if (stream === 'system') {
    return 'text-[var(--warn)]';
  }
  return 'text-[#c7d3e0]';
}

/**
 * 去掉终端 ANSI 颜色码，便于网页展示。
 *
 * @param text - 原始日志文本
 * @returns 清理后的纯文本
 */
function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE, '');
}

/**
 * 汇总项目的访问地址：各模式 openUrl + 日志探测结果（去重）。
 *
 * @param project - 项目视图
 * @returns 可打开的 URL 列表
 */
function projectUrls(project: Project): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const candidates = [
    project.openUrl,
    ...(project.runtimeUrls ?? []),
    ...(project.profileRuntimes ?? []).flatMap((item) => [
      item.profile.openUrl ?? null,
      ...item.runtimeUrls,
    ]),
  ];
  for (const item of candidates) {
    if (!item || seen.has(item)) {
      continue;
    }
    seen.add(item);
    urls.push(item);
  }
  return urls;
}

/**
 * 分期状态样式。
 *
 * @param status - 分期状态
 * @returns class
 */
function phaseClass(status: ProjectPhase['status']): string {
  return PHASE_CLASS[status];
}

/**
 * 日志模式下拉变更。
 *
 * @param event - change 事件
 * @returns {void}
 */
function onLogProfileChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  logProfileId.value = value || null;
}

/**
 * 分期状态中文。
 *
 * @param status - 分期状态
 * @returns 文案
 */
function phaseLabel(status: ProjectPhase['status']): string {
  if (status === 'done') {
    return '完成';
  }
  if (status === 'current') {
    return '进行中';
  }
  return '计划中';
}

onMounted(() => {
  void (async () => {
    await refreshAuth();
    if (authLoggedIn.value) {
      await refresh();
      projectsTimer = window.setInterval(() => void refresh(true), 3000);
    }
  })();
});

onUnmounted(() => {
  if (projectsTimer !== undefined) {
    window.clearInterval(projectsTimer);
  }
  if (logsTimer !== undefined) {
    window.clearInterval(logsTimer);
  }
  if (smsTimer !== undefined) {
    window.clearInterval(smsTimer);
  }
});

watch(
  selectedId,
  (id) => {
    if (logsTimer !== undefined) {
      window.clearInterval(logsTimer);
      logsTimer = undefined;
    }
    analysis.value = null;
    analysisHtml.value = '';
    logProfileId.value = null;
    if (!id) {
      logs.value = [];
      tagsDraft.value = '';
      detailTab.value = 'logs';
      return;
    }
    const project = projects.value.find((item) => item.id === id);
    tagsDraft.value = (project?.tags ?? []).join(', ');
    buildProfileId.value =
      project?.defaultBuildProfileId || project?.buildProfiles?.[0]?.id || '';
    detailTab.value = project?.hasAnalysis ? 'analysis' : 'logs';
    void refreshLogs(id);
    void refreshAnalysis(id);
    logsTimer = window.setInterval(() => void refreshLogs(id), 2000);
  },
  { immediate: true },
);

watch(logProfileId, () => {
  if (selectedId.value) {
    void refreshLogs(selectedId.value);
  }
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      v-if="!authReady"
      class="flex flex-1 items-center justify-center text-sm text-[var(--muted)]"
    >
      正在检查登录态…
    </div>

    <div
      v-else-if="!authLoggedIn"
      class="flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,_#152033_0%,_#0b1016_55%)] p-4"
    >
      <form
        class="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl"
        @submit.prevent="submitAuth"
      >
        <h1 class="text-center text-xl font-semibold tracking-tight">LabHub</h1>
        <p
          v-if="isDevClient"
          class="mt-2 text-center text-xs text-[var(--muted)]"
        >
          开发环境已预填测试账号 {{ DEV_TEST_PHONE }} / {{ DEV_TEST_PASSWORD }}
        </p>
        <p v-if="!cloudUrl" class="mt-3 rounded border border-[var(--danger)]/40 bg-[#3a2220] px-3 py-2 text-xs text-[var(--danger)]">
          未配置 Cloud 地址（config/public.json 的 cloudUrl）。请先启动 LabHub Cloud。
        </p>

        <div
          v-if="authMode === 'login'"
          class="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-[var(--line)] p-1 text-sm"
        >
          <button
            type="button"
            class="rounded-md px-2 py-1.5"
            :class="loginMethod === 'password' ? 'bg-[var(--accent)] font-semibold text-[#06221f]' : 'text-[var(--muted)]'"
            @click="loginMethod = 'password'"
          >
            密码登录
          </button>
          <button
            type="button"
            class="rounded-md px-2 py-1.5"
            :class="loginMethod === 'sms' ? 'bg-[var(--accent)] font-semibold text-[#06221f]' : 'text-[var(--muted)]'"
            @click="loginMethod = 'sms'"
          >
            验证码登录
          </button>
        </div>

        <label class="mt-4 block text-sm">
          手机号
          <input
            v-model="authPhone"
            required
            maxlength="11"
            placeholder="11 位手机号"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>

        <template v-if="authMode === 'login'">
          <label v-if="loginMethod === 'password'" class="mt-3 block text-sm">
            密码
            <input
              v-model="authPassword"
              type="password"
              required
              minlength="6"
              placeholder="至少 6 位"
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label v-else class="mt-3 block text-sm">
            验证码
            <div class="mt-1 flex gap-2">
              <input
                v-model="authCode"
                required
                maxlength="6"
                placeholder="6 位验证码"
                class="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                class="shrink-0 rounded-lg border border-[var(--line)] px-3 text-xs disabled:opacity-40"
                :disabled="busy || smsCooldown > 0 || !authPhone || !cloudUrl"
                @click="sendSmsCode"
              >
                {{ smsCooldown > 0 ? `${smsCooldown}s` : '获取验证码' }}
              </button>
            </div>
          </label>
        </template>

        <template v-else>
          <label class="mt-3 block text-sm">
            密码
            <input
              v-model="authPassword"
              type="password"
              required
              minlength="6"
              placeholder="至少 6 位"
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label class="mt-3 block text-sm">
            确认密码
            <input
              v-model="authPassword2"
              type="password"
              required
              minlength="6"
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label class="mt-3 block text-sm">
            短信验证码
            <div class="mt-1 flex gap-2">
              <input
                v-model="authCode"
                required
                maxlength="6"
                class="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                class="shrink-0 rounded-lg border border-[var(--line)] px-3 text-xs disabled:opacity-40"
                :disabled="busy || smsCooldown > 0 || !authPhone || !cloudUrl"
                @click="sendSmsCode"
              >
                {{ smsCooldown > 0 ? `${smsCooldown}s` : '获取验证码' }}
              </button>
            </div>
          </label>
          <label class="mt-3 block text-sm">
            邀请码（可选）
            <input
              v-model="authInvite"
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
        </template>

        <label class="mt-4 flex cursor-pointer items-start gap-2 text-xs leading-5 text-[var(--muted)]">
          <input v-model="authAgreed" type="checkbox" class="mt-0.5 accent-[var(--accent)]" />
          <span>
            我已阅读并同意
            <button type="button" class="text-[var(--text)]/80 hover:underline" @click.prevent>
              服务条款
            </button>
            和
            <button type="button" class="text-[var(--text)]/80 hover:underline" @click.prevent>
              隐私协议
            </button>
          </span>
        </label>

        <p v-if="error" class="mt-3 text-xs text-[var(--danger)]">{{ error }}</p>
        <button
          type="submit"
          :disabled="busy || !cloudUrl || !authAgreed"
          class="mt-4 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06221f] disabled:opacity-50"
        >
          {{ authMode === 'register' ? '注册并进入' : '登录并进入管理' }}
        </button>
        <button
          v-if="authMode === 'login'"
          type="button"
          class="mt-3 w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
          @click="authMode = 'register'"
        >
          注册账号
        </button>
        <button
          v-else
          type="button"
          class="mt-3 w-full text-center text-xs text-[var(--muted)] hover:text-[var(--text)]"
          @click="authMode = 'login'"
        >
          已有账号，返回登录
        </button>
      </form>
    </div>

    <template v-else>
    <header
      class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel)]/80 px-5 py-3 backdrop-blur"
    >
      <div class="min-w-0">
        <div class="flex items-baseline gap-3">
          <h1 class="text-xl font-semibold tracking-tight">LabHub</h1>
          <p class="hidden text-sm text-[var(--muted)] sm:block">多仓库启停与日志监控</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <div
          v-if="authUser"
          class="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] bg-[#0b1016]/60 px-3 py-1.5 text-xs"
        >
          <span>{{ authUser.phoneMasked }}</span>
          <span
            v-if="authUser.planName"
            class="rounded border border-[var(--line)] px-1.5 py-0.5 text-[var(--accent)]"
          >
            {{ authUser.planName }}
          </span>
          <span
            v-if="authUser.projectLimit != null"
            class="text-[var(--muted)]"
            :title="authUser.inviteCode ? `我的邀请码 ${authUser.inviteCode}` : ''"
          >
            项目 {{ authUser.projectCount ?? projects.length }}/{{ authUser.projectLimit }}
          </span>
          <span
            v-if="authUser.aiQuota"
            class="text-[var(--muted)]"
            :class="aiAtLimit ? 'text-[var(--danger)]' : ''"
          >
            AI {{ authUser.aiQuota.remaining }}/{{ authUser.aiQuota.limit }}
          </span>
          <button
            type="button"
            class="rounded border border-[var(--accent)]/50 px-2 py-0.5 text-[var(--accent)] hover:bg-[var(--accent)]/10"
            @click="openUpgrade(projectAtLimit ? 'project' : aiAtLimit ? 'ai' : 'general')"
          >
            套餐
          </button>
          <button
            v-if="missingProjects.length > 0"
            type="button"
            class="rounded border border-[var(--line)] px-2 py-0.5 hover:border-[var(--accent)]/40"
            :disabled="busy"
            @click="restoreMissing"
          >
            恢复缺失 {{ missingProjects.length }}
          </button>
          <button
            type="button"
            class="text-[var(--muted)] hover:text-[var(--text)]"
            :disabled="busy"
            @click="logout"
          >
            退出
          </button>
        </div>
      </div>
    </header>

    <div
      v-if="error"
      class="shrink-0 border-b border-[var(--danger)]/30 bg-[#3a2220] px-5 py-2 text-sm text-[var(--danger)]"
    >
      {{ error }}
    </div>

    <div
      class="flex min-h-0 flex-1 flex-col lg:flex-row"
      :class="sidebarResizing ? 'select-none' : ''"
      :style="sidebarStyle"
    >
      <aside
        class="relative flex min-h-0 flex-col border-b border-[var(--line)] lg:h-full lg:w-[var(--sidebar-w)] lg:shrink-0 lg:border-r lg:border-b-0"
        :class="sidebarResizing ? '' : 'lg:transition-[width] lg:duration-200'"
      >
        <div class="shrink-0 border-b border-[var(--line)] px-3 py-2.5">
          <div
            v-if="!sidebarCollapsed"
            class="flex items-center gap-2"
          >
            <div class="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[#0b1016]/60 px-2.5 py-1.5 text-sm">
              <span class="text-[var(--muted)]">运行中</span>
              <span class="mono font-medium text-[var(--accent)]"> {{ runningCount }}</span>
              <span class="text-[var(--muted)]"> / {{ projects.length }}</span>
            </div>
            <button
              type="button"
              :disabled="busy"
              class="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06221f] hover:brightness-110 disabled:opacity-50"
              @click="openAddProject"
            >
              添加仓库
            </button>
            <button
              type="button"
              class="hidden rounded border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)] lg:inline-flex"
              title="收起侧栏"
              @click="toggleSidebarCollapsed"
            >
              «
            </button>
          </div>
          <div
            v-else
            class="flex flex-col items-center gap-2"
          >
            <button
              type="button"
              class="hidden rounded border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)] lg:inline-flex"
              title="展开侧栏"
              @click="toggleSidebarCollapsed"
            >
              »
            </button>
            <div
              class="hidden w-full rounded-md border border-[var(--line)] bg-[#0b1016]/60 px-1 py-1 text-center text-[10px] leading-tight lg:block"
              :title="`运行中 ${runningCount} / ${projects.length}`"
            >
              <div class="text-[var(--muted)]">运行</div>
              <div class="mono font-medium text-[var(--accent)]">{{ runningCount }}/{{ projects.length }}</div>
            </div>
            <button
              type="button"
              :disabled="busy"
              class="hidden h-9 w-9 items-center justify-center rounded-md bg-[var(--accent)] text-lg font-semibold text-[#06221f] hover:brightness-110 disabled:opacity-50 lg:inline-flex"
              title="添加仓库"
              @click="openAddProject"
            >
              +
            </button>
            <!-- 窄屏仍展示完整控件 -->
            <div class="flex w-full items-center gap-2 lg:hidden">
              <div class="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[#0b1016]/60 px-2.5 py-1.5 text-sm">
                <span class="text-[var(--muted)]">运行中</span>
                <span class="mono font-medium text-[var(--accent)]"> {{ runningCount }}</span>
                <span class="text-[var(--muted)]"> / {{ projects.length }}</span>
              </div>
              <button
                type="button"
                :disabled="busy"
                class="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06221f] hover:brightness-110 disabled:opacity-50"
                @click="openAddProject"
              >
                添加仓库
              </button>
            </div>
          </div>
        </div>

        <div
          class="shrink-0 border-b border-[var(--line)] px-3 py-2"
          :class="sidebarCollapsed ? 'lg:hidden' : ''"
        >
          <label class="block text-[11px] text-[var(--muted)]">
            按名称筛选
            <select
              :value="nameFilterId"
              class="mt-1 w-full rounded border border-[var(--line)] bg-[#0b1016] px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
              @change="onNameFilterChange"
            >
              <option value="">全部项目</option>
              <option
                v-for="item in projectNameOptions"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select>
          </label>
        </div>

        <div
          class="min-h-0 flex-1 overflow-y-auto p-2"
          :class="sidebarCollapsed ? 'lg:hidden' : ''"
        >
          <div
            v-if="filteredProjects.length === 0"
            class="rounded-lg border border-dashed border-[var(--line)] px-4 py-10 text-center"
          >
            <p class="text-sm font-medium">
              {{ projects.length === 0 ? '还没有托管项目' : '没有匹配的项目' }}
            </p>
            <p class="mt-1 text-xs text-[var(--muted)]">
              {{ projects.length === 0 ? '添加 Git 地址，或运行 seed:demo' : '请选择「全部项目」清除筛选' }}
            </p>
            <button
              v-if="projects.length === 0"
              type="button"
              class="mt-4 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06221f]"
              @click="openAddProject"
            >
              添加仓库
            </button>
          </div>

          <div
            v-for="project in filteredProjects"
            :key="project.id"
            role="button"
            tabindex="0"
            class="mb-2 cursor-pointer rounded-lg border bg-[var(--panel)]/55 px-3 py-3 transition"
            :class="
              selectedId === project.id
                ? 'border-[var(--accent)]/50 bg-[var(--panel)]'
                : 'border-[var(--line)] hover:border-[var(--accent)]/30 hover:bg-[var(--panel)]'
            "
            @click="selectedId = project.id"
            @keydown.enter="selectedId = project.id"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate font-medium">{{ project.name }}</span>
                  <span
                    class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :class="statusClass(project.runtime.status)"
                  >
                    {{ statusLabel(project.runtime.status) }}
                  </span>
                  <span
                    v-if="project.currentPhase"
                    class="rounded border border-[var(--accent)]/35 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]"
                  >
                    {{ project.currentPhase }}
                  </span>
                </div>
                <div v-if="project.tags?.length" class="mt-1.5 flex flex-wrap items-center gap-1">
                  <span
                    v-for="tag in cardTags(project.tags).visible"
                    :key="tag"
                    class="rounded bg-[#0b1016] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                  >
                    {{ tag }}
                  </span>
                  <span
                    v-if="cardTags(project.tags).hasMore"
                    class="rounded bg-[#0b1016] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                    :title="project.tags.join('、')"
                  >
                    …
                  </span>
                </div>
                <p class="mt-1.5 text-[11px] text-[var(--muted)]">
                  <template v-if="(project.startProfiles?.length ?? 0) > 1">
                    {{ project.startProfiles.length }} 个启动模式 · 默认
                    {{ project.defaultProfileId }}
                  </template>
                  <template v-else>单模式启动</template>
                </p>
              </div>
              <button
                v-if="
                  project.runtime.status === 'running' || project.runtime.status === 'starting'
                "
                type="button"
                :disabled="busy"
                class="shrink-0 rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                :class="toneClass('danger')"
                @click="toggleProject(project, $event)"
              >
                停止
              </button>
              <button
                v-else
                type="button"
                :disabled="busy || !project.exists"
                class="shrink-0 rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                :class="toneClass('ok')"
                @click="toggleProject(project, $event)"
              >
                启动
              </button>
            </div>
            <div class="mt-1.5 flex items-center justify-between gap-3">
              <p class="mono min-w-0 truncate text-[11px] text-[var(--muted)]">{{ project.id }}</p>
              <button
                v-if="project.hasAnalysis"
                type="button"
                class="shrink-0 text-[11px] text-[var(--accent)] underline-offset-2 hover:underline"
                @click="openAnalysis(project.id, $event)"
              >
                查看分析总结 →
              </button>
            </div>
          </div>
        </div>

        <div
          v-show="sidebarCollapsed"
          class="hidden min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto py-2 lg:flex"
        >
          <button
            v-for="project in filteredProjects"
            :key="project.id"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-medium transition"
            :class="
              selectedId === project.id
                ? 'border-[var(--accent)]/50 bg-[var(--panel)] text-[var(--accent)]'
                : 'border-[var(--line)] bg-[var(--panel)]/55 text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[var(--text)]'
            "
            :title="project.name"
            @click="selectedId = project.id"
          >
            {{ project.name.slice(0, 1) }}
          </button>
        </div>

        <div
          v-if="!sidebarCollapsed"
          class="absolute top-0 right-0 z-10 hidden h-full w-1.5 cursor-col-resize touch-none lg:block"
          title="拖拽调节宽度"
          @mousedown="startSidebarResize"
        >
          <div
            class="mx-auto h-full w-px bg-transparent transition-colors"
            :class="sidebarResizing ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]/50'"
          />
        </div>
      </aside>

      <main class="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          v-if="!selected"
          class="flex flex-1 items-center justify-center px-6 text-sm text-[var(--muted)]"
        >
          选择左侧项目查看详情与日志
        </div>

        <template v-else>
          <div class="flex min-h-0 flex-1 flex-col">
          <div class="shrink-0 border-b border-[var(--line)] px-5 py-2.5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-medium">{{ selected.name }}</h3>
                  <span
                    class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :class="statusClass(selected.runtime.status)"
                  >
                    {{ statusLabel(selected.runtime.status) }}
                  </span>
                  <span
                    v-if="selected.currentPhase"
                    class="rounded border border-[var(--accent)]/40 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]"
                  >
                    当前 {{ selected.currentPhase }}
                  </span>
                  <span v-if="selected.runtime.pid" class="mono text-xs text-[var(--muted)]">
                    pid {{ selected.runtime.pid }}
                  </span>
                  <button
                    type="button"
                    class="rounded border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
                    :title="detailMetaCollapsed ? '展开项目详情与启动模式' : '收起以放大下方控制台'"
                    @click="toggleDetailMetaCollapsed"
                  >
                    {{ detailMetaCollapsed ? '展开详情 »' : '收起详情 «' }}
                  </button>
                </div>
                <p
                  v-if="!detailMetaCollapsed"
                  class="mono mt-1 break-all text-xs text-[var(--muted)]"
                >
                  {{ selected.absolutePath }}
                </p>
                <p
                  v-else
                  class="mt-1 text-[11px] text-[var(--muted)]"
                >
                  已收起项目详情与启动模式 · 下方控制台可全高查看
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  :disabled="busy || !selected.exists"
                  class="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  :class="toneClass()"
                  @click="installSelected"
                >
                  安装依赖
                </button>
                <select
                  :value="buildProfileId"
                  :disabled="busy || !selected.exists || !(selected.buildProfiles?.length)"
                  class="max-w-[10rem] rounded-md border border-[var(--line)] bg-[#0b1016] px-2 py-1.5 text-xs outline-none disabled:opacity-40"
                  @change="onBuildProfileChange"
                >
                  <option
                    v-for="item in selected.buildProfiles"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                  </option>
                </select>
                <button
                  type="button"
                  :disabled="busy || !selected.exists || !buildProfileId"
                  class="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  :class="toneClass('ok')"
                  @click="buildSelected()"
                >
                  构建
                </button>
                <button
                  v-if="selected.hasAnalysis"
                  type="button"
                  :disabled="busy"
                  class="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  :class="
                    detailTab === 'analysis'
                      ? 'border-[var(--accent)]/50 text-[var(--accent)] bg-[var(--accent)]/10'
                      : toneClass()
                  "
                  @click="detailTab = 'analysis'"
                >
                  分析总结
                </button>
                <button
                  type="button"
                  :disabled="busy"
                  class="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  :class="toneClass()"
                  @click="syncSelected"
                >
                  同步 origin
                </button>
                <button
                  type="button"
                  :disabled="busy"
                  class="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  :class="toneClass('danger')"
                  @click="removeSelected"
                >
                  移除登记
                </button>
              </div>
            </div>
          </div>

            <div
              v-show="!detailMetaCollapsed"
              class="min-h-0 max-h-[min(46vh,34rem)] shrink overflow-y-auto border-b border-[var(--line)] px-5 py-3"
            >
              <div
                v-if="selected.phases?.length"
                class="flex flex-wrap gap-1.5"
              >
                <span
                  v-for="phase in selected.phases"
                  :key="phase.id"
                  class="rounded border px-2 py-1 text-[11px]"
                  :class="phaseClass(phase.status)"
                  :title="phase.summary"
                >
                  {{ phase.id }} {{ phase.name }}
                  <span class="opacity-70">· {{ phaseLabel(phase.status) }}</span>
                </span>
              </div>
              <div
                v-if="!selected.exists"
                class="mt-2 space-y-2 text-xs text-[var(--danger)]"
              >
                <p>项目目录不存在（{{ selected.absolutePath }}），启动已禁用。</p>
                <button
                  type="button"
                  class="rounded border border-[var(--danger)]/40 px-2 py-1 text-[11px] text-[var(--warn)] hover:bg-[#3a3420]"
                  :disabled="busy"
                  @click="restoreOne(selected.id)"
                >
                  重新克隆恢复
                </button>
              </div>
              <div v-if="projectUrls(selected).length" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="text-xs text-[var(--muted)]">运行地址</span>
                <a
                  v-for="url in projectUrls(selected)"
                  :key="url"
                  :href="url"
                  target="_blank"
                  rel="noreferrer"
                  class="mono text-xs text-[var(--accent)] hover:underline"
                >
                  {{ url }}
                </a>
              </div>
              <p v-else class="mt-2 text-xs text-[var(--muted)]">
                暂无运行地址：可在各启动模式中配置，或等待日志出现 Local / Server 地址后自动探测。
              </p>
              <p v-if="selected.git?.head" class="mt-1 text-xs text-[var(--muted)]">
                {{ selected.git.branch }}@{{ selected.git.head }}{{ selected.git.dirty ? ' *' : '' }}
              </p>
              <div class="mt-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs text-[var(--muted)]">启动模式（可并行）</span>
                  <span class="mono text-[11px] text-[var(--muted)]">{{ selected.installCommand }}</span>
                </div>
                <div
                  v-for="item in selected.profileRuntimes"
                  :key="item.profile.id"
                  class="rounded-lg border border-[var(--line)] bg-[#0b1016]/70 px-3 py-2"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-medium">{{ item.profile.name }}</span>
                        <span
                          class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                          :class="statusClass(item.runtime.status)"
                        >
                          {{ statusLabel(item.runtime.status) }}
                        </span>
                        <span
                          v-if="item.profile.phase"
                          class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                        >
                          {{ item.profile.phase }}
                        </span>
                        <span
                          v-if="item.profile.id === selected.defaultProfileId"
                          class="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]"
                        >
                          默认
                        </span>
                      </div>
                      <p class="mono mt-1 break-all text-[11px] text-[var(--muted)]">
                        {{ item.profile.command }}
                        <span v-if="item.profile.cwd"> · cwd {{ item.profile.cwd }}</span>
                      </p>
                      <p v-if="item.profile.description" class="mt-1 text-[11px] text-[var(--muted)]">
                        {{ item.profile.description }}
                      </p>
                      <p v-if="item.runtime.error" class="mt-1 text-[11px] text-[var(--danger)]">
                        {{ item.runtime.error }}
                      </p>
                    </div>
                    <div class="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        class="rounded border px-2 py-1 text-[11px] font-medium"
                        :class="
                          logProfileId === item.profile.id
                            ? 'border-[var(--accent)]/50 text-[var(--accent)]'
                            : toneClass()
                        "
                        @click="logProfileId = item.profile.id; detailTab = 'logs'"
                      >
                        日志
                      </button>
                      <button
                        v-if="
                          item.runtime.status === 'running' || item.runtime.status === 'starting'
                        "
                        type="button"
                        :disabled="busy"
                        class="rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                        :class="toneClass('danger')"
                        @click="toggleProfile(item.profile.id, true)"
                      >
                        停止
                      </button>
                      <button
                        v-else
                        type="button"
                        :disabled="busy || !selected.exists"
                        class="rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                        :class="toneClass('ok')"
                        @click="toggleProfile(item.profile.id, false)"
                      >
                        启动
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selected.buildProfiles?.length" class="mt-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs text-[var(--muted)]">构建目标（按包 / 脚本）</span>
                  <span class="text-[11px] text-[var(--muted)]">
                    默认 {{ selected.defaultBuildProfileId }}
                  </span>
                </div>
                <div
                  v-for="item in selected.buildProfiles"
                  :key="item.id"
                  class="rounded-lg border border-[var(--line)] bg-[#0b1016]/70 px-3 py-2"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-medium">{{ item.name }}</span>
                        <span
                          v-if="item.id === selected.defaultBuildProfileId"
                          class="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] text-[var(--accent)]"
                        >
                          默认
                        </span>
                      </div>
                      <p class="mono mt-1 break-all text-[11px] text-[var(--muted)]">
                        {{ item.command }}
                        <span v-if="item.cwd"> · cwd {{ item.cwd }}</span>
                      </p>
                      <p v-if="item.description" class="mt-1 text-[11px] text-[var(--muted)]">
                        {{ item.description }}
                      </p>
                    </div>
                    <div class="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        class="rounded border px-2 py-1 text-[11px] font-medium"
                        :class="
                          logProfileId === `build:${item.id}`
                            ? 'border-[var(--accent)]/50 text-[var(--accent)]'
                            : toneClass()
                        "
                        @click="logProfileId = `build:${item.id}`; detailTab = 'logs'"
                      >
                        日志
                      </button>
                      <button
                        type="button"
                        :disabled="busy || !selected.exists"
                        class="rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                        :class="toneClass('ok')"
                        @click="buildSelected(item.id)"
                      >
                        构建
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="text-xs text-[var(--muted)]">分类标签</span>
                <input
                  v-model="tagsDraft"
                  placeholder="如：LLM, 网关"
                  class="mono min-w-[12rem] flex-1 rounded border border-[var(--line)] bg-[#0b1016] px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  :disabled="busy"
                  class="rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                  :class="toneClass()"
                  @click="saveSelectedTags"
                >
                  保存标签
                </button>
              </div>
            </div>

          <p v-if="selected.runtime.error" class="shrink-0 px-5 py-2 text-sm text-[var(--danger)]">
            {{ selected.runtime.error }}
          </p>

          <div class="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-3 px-1">
              <div class="flex items-center gap-1 rounded-md border border-[var(--line)] p-0.5">
                <button
                  type="button"
                  class="rounded px-3 py-1 text-xs font-medium"
                  :class="
                    detailTab === 'logs'
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  "
                  @click="detailTab = 'logs'"
                >
                  运行日志
                </button>
                <button
                  type="button"
                  class="rounded px-3 py-1 text-xs font-medium"
                  :class="
                    detailTab === 'analysis'
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  "
                  @click="detailTab = 'analysis'"
                >
                  分析总结
                  <span v-if="selected.hasAnalysis" class="ml-1 text-[10px] opacity-80">●</span>
                </button>
              </div>
              <div v-if="detailTab === 'logs'" class="flex flex-wrap items-center gap-2">
                <select
                  :value="logProfileId ?? ''"
                  class="rounded border border-[var(--line)] bg-[#0b1016] px-2 py-1 text-xs outline-none"
                  @change="onLogProfileChange"
                >
                  <option value="">全部模式</option>
                  <option
                    v-for="item in selected.profileRuntimes"
                    :key="item.profile.id"
                    :value="item.profile.id"
                  >
                    {{ item.profile.name }}
                  </option>
                  <option
                    v-for="item in selected.buildProfiles"
                    :key="`build:${item.id}`"
                    :value="`build:${item.id}`"
                  >
                    构建 · {{ item.name }}
                  </option>
                </select>
                <span class="text-xs text-[var(--muted)]">自动刷新 · 近 300 行</span>
                <button
                  type="button"
                  :disabled="busy || logs.length === 0"
                  class="rounded border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)] hover:border-[var(--danger)]/40 hover:text-[var(--danger)] disabled:opacity-40"
                  @click="clearLogs"
                >
                  清空
                </button>
              </div>
              <div v-else class="flex flex-wrap items-center gap-2">
                <span v-if="analysis?.updatedAt" class="text-xs text-[var(--muted)]">
                  更新于 {{ analysis.updatedAt.slice(0, 19).replace('T', ' ') }}
                </span>
                <button
                  type="button"
                  :disabled="busy || analysisLoading"
                  class="rounded border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)] disabled:opacity-40"
                  @click="regenerateAnalysis"
                >
                  本地重生成
                </button>
              </div>
            </div>

            <div
              v-show="detailTab === 'logs'"
              ref="logPanel"
              class="mono min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--line)] bg-[#0b1016] p-3 text-xs leading-5"
            >
              <span v-if="logs.length === 0" class="text-[var(--muted)]">暂无日志</span>
              <div
                v-for="(line, index) in logs"
                :key="`${line.ts}-${index}`"
                class="whitespace-pre-wrap break-words"
                :class="logClass(line.stream)"
              >
                <span class="text-[var(--muted)]">{{ line.ts.slice(11, 19) }} </span>
                {{ stripAnsi(line.text) }}
              </div>
            </div>

            <div
              v-show="detailTab === 'analysis'"
              class="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--line)] bg-[#0b1016] p-5"
            >
              <p v-if="analysisLoading" class="text-sm text-[var(--muted)]">正在加载分析总结…</p>
              <div
                v-else-if="analysis?.exists && analysisHtml"
                class="analysis-doc"
                v-html="analysisHtml"
              />
              <div v-else class="text-sm text-[var(--muted)]">
                <p>尚未生成项目分析总结。已登录时首次「添加仓库」会走 Cloud AI（计配额）；未登录或失败则本地启发式。本页按钮仅本地规则。</p>
                <p class="mono mt-2 text-xs">
                  约定路径：{{ analysis?.relativePath ?? 'docs/项目分析总结.md' }}
                </p>
                <button
                  type="button"
                  :disabled="busy || analysisLoading"
                  class="mt-4 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06221f] disabled:opacity-50"
                  @click="regenerateAnalysis"
                >
                  本地生成
                </button>
              </div>
            </div>
          </div>
          </div>
        </template>
      </main>
    </div>

    <div
      v-if="showUpgrade"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="showUpgrade = false"
    >
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-medium">套餐与权限</h3>
            <p class="mt-1 text-sm text-[var(--muted)]">
              <template v-if="upgradeReason === 'project'">当前项目管理额度已满，请升级套餐后继续添加。</template>
              <template v-else-if="upgradeReason === 'ai'">本月 AI 次数已用完，可升级套餐或购买加油包。</template>
              <template v-else>在系统内选择套餐并支付开通，立即生效。</template>
            </p>
          </div>
          <div
            v-if="authUser"
            class="rounded-lg border border-[var(--line)] bg-[#0b1016]/60 px-3 py-2 text-xs"
          >
            <p>
              当前版本：
              <span class="font-medium text-[var(--accent)]">{{ authUser.planName || '免费版' }}</span>
            </p>
            <p class="mt-1 text-[var(--muted)]">
              项目 {{ authUser.projectCount ?? projects.length }}/{{ authUser.projectLimit ?? '-' }}
              · AI {{ authUser.aiQuota?.remaining ?? '-' }}/{{ authUser.aiQuota?.limit ?? '-' }}
            </p>
            <p v-if="authUser.planExpiresAt" class="mt-1 text-[var(--muted)]">
              到期 {{ authUser.planExpiresAt.slice(0, 10) }}
            </p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span class="text-[var(--muted)]">计费周期</span>
          <button
            type="button"
            class="rounded-md border px-2.5 py-1"
            :class="billingCycle === 'monthly' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--muted)]'"
            @click="billingCycle = 'monthly'"
          >
            月付
          </button>
          <button
            type="button"
            class="rounded-md border px-2.5 py-1"
            :class="billingCycle === 'yearly' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--muted)]'"
            @click="billingCycle = 'yearly'"
          >
            年付更优惠
          </button>
        </div>

        <div
          v-if="billingCatalog"
          class="mt-4 grid gap-3 md:grid-cols-3"
        >
          <button
            v-for="plan in billingCatalog.plans"
            :key="plan.id"
            type="button"
            class="rounded-lg border p-3 text-left transition"
            :class="
              selectedPlanId === plan.id
                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--line)] bg-[#0b1016]/40 hover:border-[var(--accent)]/40'
            "
            @click="selectedPlanId = plan.id"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-medium">{{ plan.name }}</p>
              <span
                v-if="authUser?.planId === plan.id"
                class="rounded bg-[var(--accent)]/20 px-1.5 py-0.5 text-[10px] text-[var(--accent)]"
              >
                当前
              </span>
            </div>
            <p class="mt-1 text-xs text-[var(--muted)]">{{ plan.description }}</p>
            <p class="mt-2 text-sm font-semibold text-[var(--accent)]">
              <template v-if="plan.isFree">免费</template>
              <template v-else-if="billingCycle === 'yearly'">¥{{ plan.priceYearly }}/年</template>
              <template v-else>¥{{ plan.priceMonthly }}/月</template>
            </p>
            <ul class="mt-3 space-y-1 text-[11px] text-[var(--muted)]">
              <li
                v-for="feature in plan.features"
                :key="feature.key"
                class="flex justify-between gap-2"
              >
                <span>{{ feature.label }}</span>
                <span class="text-[var(--text)]/80">
                  {{ feature.value === true ? '✓' : feature.value === false ? '—' : feature.value }}
                </span>
              </li>
            </ul>
          </button>
        </div>
        <p v-else class="mt-4 text-sm text-[var(--muted)]">正在加载套餐…</p>

        <div
          v-if="billingCatalog?.aiPack"
          class="mt-3 rounded-lg border border-[var(--line)] p-3"
          :class="selectedPlanId === 'ai_pack' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'bg-[#0b1016]/40'"
        >
          <button
            type="button"
            class="flex w-full items-start justify-between gap-3 text-left"
            @click="selectedPlanId = 'ai_pack'"
          >
            <div>
              <p class="font-medium">{{ billingCatalog.aiPack.name }}</p>
              <p class="mt-1 text-xs text-[var(--muted)]">{{ billingCatalog.aiPack.description }}</p>
            </div>
            <p class="shrink-0 text-sm font-semibold text-[var(--accent)]">
              ¥{{ billingCatalog.aiPack.price }} / {{ billingCatalog.aiPack.quota }} 次
            </p>
          </button>
        </div>

        <p
          v-if="authUser?.inviteCode"
          class="mt-3 text-[11px] text-[var(--muted)]"
        >
          邀请好友注册双方项目额度各 +1（不替代付费）。我的邀请码：
          <span class="mono text-[var(--text)]">{{ authUser.inviteCode }}</span>
        </p>

        <p v-if="billingMessage" class="mt-3 text-xs" :class="billingMessage.includes('成功') || billingMessage.includes('已切换') ? 'text-[var(--accent)]' : 'text-[var(--danger)]'">
          {{ billingMessage }}
        </p>
        <p
          v-if="billingCatalog?.paymentMode === 'mock'"
          class="mt-2 text-[11px] text-[var(--muted)]"
        >
          当前为系统内模拟支付：点击确认后立即开通（联调用）。正式环境可再接微信/支付宝。
        </p>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            v-if="authUser?.planId && authUser.planId !== 'free'"
            type="button"
            class="rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
            :disabled="billingBusy"
            @click="switchToFree"
          >
            切换到免费版
          </button>
          <div class="ml-auto flex gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-white"
              @click="showUpgrade = false"
            >
              关闭
            </button>
            <button
              v-if="selectedPlanId === 'free'"
              type="button"
              class="rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
              :disabled="billingBusy || authUser?.planId === 'free'"
              @click="switchToFree"
            >
              {{ authUser?.planId === 'free' ? '已是免费版' : '确认使用免费版' }}
            </button>
            <button
              v-else
              type="button"
              class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06221f] disabled:opacity-50"
              :disabled="billingBusy"
              @click="checkoutAndPay"
            >
              {{
                billingBusy
                  ? '处理中…'
                  : selectedPlanId !== 'ai_pack' && authUser?.planId === selectedPlanId
                    ? `续费 ${selectedPlanPriceLabel}`
                    : `支付 ${selectedPlanPriceLabel} 并开通`
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showAdd"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <form
        class="w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl"
        @submit="submitAdd"
      >
        <h3 class="text-lg font-medium">添加 Git 仓库</h3>
        <p class="mt-1 text-sm text-[var(--muted)]">
          粘贴 GitHub / Gitee 地址，将浅克隆到 projects/ 下。
        </p>
        <p
          v-if="authUser?.projectLimit != null"
          class="mt-2 text-xs text-[var(--muted)]"
        >
          当前额度
          {{ authUser.projectCount ?? projects.length }}/{{ authUser.projectLimit }}
          <button
            type="button"
            class="ml-2 text-[var(--accent)] hover:underline"
            @click="openUpgrade('project')"
          >
            查看升级
          </button>
        </p>
        <label class="mt-4 block text-sm">
          仓库 URL
          <input
            v-model="repoUrl"
            required
            placeholder="https://github.com/org/repo.git"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label class="mt-3 block text-sm">
          分支
          <input
            v-model="branch"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label class="mt-3 block text-sm">
          启动命令
          <input
            v-model="startCommand"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label class="mt-3 block text-sm">
          运行地址（可选）
          <input
            v-model="openUrl"
            type="url"
            placeholder="http://127.0.0.1:5173"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label class="mt-3 block text-sm">
          分类标签（可选，逗号分隔）
          <input
            v-model="tagsInput"
            placeholder="LLM, 网关, 自托管"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label class="mt-3 block text-sm">
          upstream（可选，fork 同步用）
          <input
            v-model="upstreamUrl"
            placeholder="https://github.com/upstream/repo.git"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-white"
            @click="showAdd = false"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="busy"
            class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06221f] disabled:opacity-50"
          >
            克隆并登记
          </button>
        </div>
      </form>
    </div>
    </template>
  </div>
</template>
