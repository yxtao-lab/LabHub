<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { marked } from 'marked';
import {
  api,
  ApiError,
  type Category,
  type LogLine,
  type ProfileRuntimeView,
  type Project,
  type ProjectPhase,
  type RuntimeStatus,
} from './api';
import { splitLogTextWithUrls, type LogTextPart } from './log-links';

type DetailTab = 'logs' | 'analysis';
type UpgradeReason = 'project' | 'ai' | 'general';
type BillingCycle = 'monthly' | 'yearly';
type LegalDocKind = 'terms' | 'privacy';

/** 侧栏分组：一个分类及其项目 */
type ProjectGroup = {
  id: string;
  name: string;
  projects: Project[];
  isUncategorized: boolean;
};

/** 右键菜单目标 */
type ContextMenuState = {
  kind: 'project' | 'category';
  id: string;
  x: number;
  y: number;
};

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
const categories = ref<Category[]>([]);
const selectedId = ref<string | null>(null);
const logs = ref<LogLine[]>([]);
const logProfileId = ref<string | null>(null);
const buildProfileId = ref<string>('');
const error = ref<string | null>(null);
const busy = ref(false);
const showAdd = ref(false);
const addSubmitting = ref(false);
const addProgressLabel = ref('');
const addProgressElapsed = ref(0);
const addError = ref<string | null>(null);
const addCloneProgress = ref<{
  stage: string;
  percent: number;
  received: number;
  total: number;
  remaining: number;
  speed: string | null;
} | null>(null);
const addInstallLog = ref('');
let addElapsedTimer: number | undefined;
const switchJobOpen = ref(false);
const switchJobTitle = ref('');
const switchJobLabel = ref('');
const switchJobElapsed = ref(0);
const switchJobProgress = ref<{
  stage: string;
  percent: number;
  received: number;
  total: number;
  remaining: number;
  speed: string | null;
} | null>(null);
let switchElapsedTimer: number | undefined;
const showCategoryModal = ref(false);
const categoryModalMode = ref<'create' | 'rename'>('create');
const categoryModalTargetId = ref<string | null>(null);
const categoryNameDraft = ref('');
const showRenameProject = ref(false);
const renameProjectId = ref<string | null>(null);
const renameProjectDraft = ref('');
const contextMenu = ref<ContextMenuState | null>(null);
const contextMoveOpen = ref(false);
const contextBranchOpen = ref(false);
const contextBranches = ref<string[]>([]);
const contextBranchCurrent = ref<string | null>(null);
const contextBranchesLoading = ref(false);
const contextBranchesError = ref<string | null>(null);
const showUpgrade = ref(false);
const legalDoc = ref<LegalDocKind | null>(null);
const upgradeReason = ref<UpgradeReason>('general');
const billingCatalog = ref<BillingCatalog | null>(null);
const billingCycle = ref<BillingCycle>('monthly');
const selectedPlanId = ref('basic');
const billingBusy = ref(false);
const billingMessage = ref<string | null>(null);
const toastMessage = ref<string | null>(null);
let toastTimer: number | undefined;
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
/** LabHub 本仓公开 Git 地址 */
const labhubRepoUrl = ref<string | null>(null);
const authUser = ref<CloudUser | null>(null);
const authLoggedIn = ref(false);
const authReady = ref(false);
const repoUrl = ref('');
const startCommand = ref('');
const branch = ref('');
const remoteBranches = ref<string[]>([]);
const remoteDefaultBranch = ref<string | null>(null);
const remoteBranchesLoading = ref(false);
const remoteBranchesError = ref<string | null>(null);
let remoteBranchesTimer: number | undefined;
let remoteBranchesRequestId = 0;
const openUrl = ref('');
const upstreamUrl = ref('');
const tagsInput = ref('');
const tagsDraft = ref('');
const categoryIdInput = ref('');
const categoryIdDraft = ref('');
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
const CATEGORY_COLLAPSED_KEY = 'labhub.categoryCollapsed';
const UNCATEGORIZED_ID = '__uncategorized__';

/** 收起的分类 id 集合（含 __uncategorized__） */
const collapsedCategoryIds = ref<Set<string>>(loadCollapsedCategories());

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
 * 从 localStorage 读取已收起的分类 id。
 *
 * @returns 分类 id 集合
 */
function loadCollapsedCategories(): Set<string> {
  try {
    const raw = localStorage.getItem(CATEGORY_COLLAPSED_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

/**
 * 持久化分类收起状态。
 *
 * @returns {void}
 */
function persistCollapsedCategories(): void {
  try {
    localStorage.setItem(
      CATEGORY_COLLAPSED_KEY,
      JSON.stringify([...collapsedCategoryIds.value]),
    );
  } catch {
    // 忽略存储失败
  }
}

/**
 * 切换某个分类的收起/展开。
 *
 * @param categoryId - 分类 id（未分类为 UNCATEGORIZED_ID）
 * @returns {void}
 */
function toggleCategoryCollapsed(categoryId: string): void {
  const next = new Set(collapsedCategoryIds.value);
  if (next.has(categoryId)) {
    next.delete(categoryId);
  } else {
    next.add(categoryId);
  }
  collapsedCategoryIds.value = next;
  persistCollapsedCategories();
}

/**
 * 判断分类是否收起。
 *
 * @param categoryId - 分类 id
 * @returns 是否收起
 */
function isCategoryCollapsed(categoryId: string): boolean {
  return collapsedCategoryIds.value.has(categoryId);
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

const planSummary = computed(() => {
  const user = authUser.value;
  if (!user) {
    return '';
  }
  const name = user.planName || '免费版';
  const expire = user.planExpiresAt ? ` · 至 ${user.planExpiresAt.slice(0, 10)}` : '';
  return `${name}${expire}`;
});

/**
 * 展示短暂提示。
 *
 * @param message - 文案
 * @returns {void}
 */
function showToast(message: string): void {
  toastMessage.value = message;
  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toastMessage.value = null;
    toastTimer = undefined;
  }, 2200);
}

/**
 * 复制文本到剪贴板。
 *
 * @param text - 文本
 * @returns 是否成功
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(input);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * 复制当前用户邀请码。
 *
 * @returns {Promise<void>}
 */
async function copyInviteCode(): Promise<void> {
  const code = authUser.value?.inviteCode?.trim();
  if (!code) {
    showToast('暂无邀请码');
    return;
  }
  const ok = await copyText(code);
  showToast(ok ? `邀请码已复制：${code}` : '复制失败，请手动选择');
}

/**
 * 打开法律文档弹窗。
 *
 * @param kind - 条款或隐私
 * @returns {void}
 */
function openLegalDoc(kind: LegalDocKind): void {
  legalDoc.value = kind;
}

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
  categoryIdInput.value = selected.value?.categoryId ?? '';
  remoteBranches.value = [];
  remoteDefaultBranch.value = null;
  remoteBranchesError.value = null;
  branch.value = '';
  showAdd.value = true;
}

/**
 * 根据仓库 URL 探测远程分支列表。
 *
 * @param url - 仓库地址
 * @returns {Promise<void>}
 */
async function fetchRemoteBranches(url: string): Promise<void> {
  const trimmed = url.trim();
  const requestId = ++remoteBranchesRequestId;
  if (!trimmed || !/^https?:\/\/|^git@/i.test(trimmed)) {
    remoteBranches.value = [];
    remoteDefaultBranch.value = null;
    remoteBranchesError.value = null;
    remoteBranchesLoading.value = false;
    return;
  }
  remoteBranchesLoading.value = true;
  remoteBranchesError.value = null;
  try {
    const data = await api<{ branches: string[]; defaultBranch: string | null }>(
      `/api/projects/remote-branches?repoUrl=${encodeURIComponent(trimmed)}`,
    );
    if (requestId !== remoteBranchesRequestId) {
      return;
    }
    remoteBranches.value = data.branches;
    remoteDefaultBranch.value = data.defaultBranch;
    if (!branch.value && data.defaultBranch) {
      branch.value = data.defaultBranch;
    } else if (branch.value && data.branches.length > 0 && !data.branches.includes(branch.value)) {
      branch.value = data.defaultBranch || data.branches[0] || '';
    }
  } catch (err) {
    if (requestId !== remoteBranchesRequestId) {
      return;
    }
    remoteBranches.value = [];
    remoteDefaultBranch.value = null;
    remoteBranchesError.value = err instanceof Error ? err.message : String(err);
  } finally {
    if (requestId === remoteBranchesRequestId) {
      remoteBranchesLoading.value = false;
    }
  }
}

/**
 * 防抖触发远程分支探测。
 *
 * @param url - 仓库地址
 * @returns {void}
 */
function scheduleFetchRemoteBranches(url: string): void {
  if (remoteBranchesTimer !== undefined) {
    window.clearTimeout(remoteBranchesTimer);
  }
  remoteBranchesTimer = window.setTimeout(() => {
    void fetchRemoteBranches(url);
  }, 450);
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
      labhubRepoUrl?: string | null;
      loggedIn: boolean;
      user: CloudUser | null;
    }>('/api/auth/status');
    cloudUrl.value = data.cloudUrl;
    labhubRepoUrl.value = data.labhubRepoUrl ?? null;
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
 * 同步并打开 labhub.code-workspace，使托管仓进入 Cursor 源代码管理。
 *
 * @returns {Promise<void>}
 */
async function openGitWorkspace(): Promise<void> {
  busy.value = true;
  try {
    const data = await api<{ hint?: string; workspacePath?: string }>(
      '/api/workspace/open',
      { method: 'POST', body: '{}' },
    );
    showToast(data.hint || `已打开工作区：${data.workspacePath ?? 'labhub.code-workspace'}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
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
 * 按分类分组的侧栏列表（含未分类；空分类也展示以便管理）。
 *
 * @returns 分组数组
 */
const projectGroups = computed((): ProjectGroup[] => {
  const list = filteredProjects.value;
  const byCategory = new Map<string, Project[]>();
  for (const project of list) {
    const key = project.categoryId || UNCATEGORIZED_ID;
    const bucket = byCategory.get(key);
    if (bucket) {
      bucket.push(project);
    } else {
      byCategory.set(key, [project]);
    }
  }

  const groups: ProjectGroup[] = categories.value.map((category) => ({
    id: category.id,
    name: category.name,
    projects: byCategory.get(category.id) ?? [],
    isUncategorized: false,
  }));

  const uncategorized = byCategory.get(UNCATEGORIZED_ID) ?? [];
  if (uncategorized.length > 0 || categories.value.length === 0) {
    groups.push({
      id: UNCATEGORIZED_ID,
      name: '未分类',
      projects: uncategorized,
      isUncategorized: true,
    });
  }

  // 名称筛选时隐藏空分组，避免干扰
  if (nameFilterId.value) {
    return groups.filter((group) => group.projects.length > 0);
  }
  return groups;
});

/**
 * 卡片上最多展示的业务标签数量（分支名单独占首位，不计入此限额）。
 */
const CARD_TAG_LIMIT = 3;

/**
 * 卡片标签行：分支名（若有）+ 业务标签截断。
 *
 * @param project - 项目视图
 * @returns 分支、可见业务标签、是否还有更多
 */
function cardTagRow(project: Project): {
  branch: string | null;
  visible: string[];
  hasMore: boolean;
} {
  const branch = (project.git?.branch || project.branch || '').trim() || null;
  const list = project.tags ?? [];
  return {
    branch,
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
    const [projectData, categoryData] = await Promise.all([
      api<{ projects: Project[] }>('/api/projects'),
      api<{ categories: Category[] }>('/api/categories'),
    ]);
    projects.value = projectData.projects;
    categories.value = categoryData.categories;
    error.value = null;
    if (!selectedId.value && projectData.projects[0]) {
      selectedId.value = projectData.projects[0].id;
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
  if (!running && project.needsInstall) {
    selectedId.value = project.id;
    error.value = '请先安装依赖，完成后再启动项目';
    showToast('请先安装依赖');
    return;
  }
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
  if (!running && selected.value.needsInstall) {
    error.value = '请先安装依赖，完成后再启动项目';
    showToast('请先安装依赖');
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
  if (selected.value.needsInstall) {
    error.value = '请先安装依赖，完成后再构建';
    showToast('请先安装依赖');
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
 * 开始添加仓库的进度提示（计时）。
 *
 * @returns {void}
 */
function startAddProgress(): void {
  stopAddProgress();
  addSubmitting.value = true;
  addError.value = null;
  addCloneProgress.value = null;
  addInstallLog.value = '';
  addProgressElapsed.value = 0;
  addProgressLabel.value = '正在准备克隆…';
  addElapsedTimer = window.setInterval(() => {
    addProgressElapsed.value += 1;
  }, 1000);
}

/**
 * 停止添加仓库进度提示。
 *
 * @returns {void}
 */
function stopAddProgress(): void {
  addSubmitting.value = false;
  if (addElapsedTimer !== undefined) {
    window.clearInterval(addElapsedTimer);
    addElapsedTimer = undefined;
  }
}

/**
 * 将 git 阶段名翻译为中文。
 *
 * @param stage - git 进度阶段
 * @returns 中文文案
 */
function gitStageLabel(stage: string): string {
  const map: Record<string, string> = {
    'Counting objects': '计数对象',
    'Compressing objects': '压缩对象',
    'Receiving objects': '接收对象',
    'Resolving deltas': '解析增量',
  };
  return map[stage] || stage;
}

/**
 * 以 NDJSON 流方式登记项目，并更新进度 UI。
 *
 * @param body - 请求体
 * @returns 新建项目
 * @throws {ApiError} 失败时抛出
 */
async function addProjectWithProgress(body: Record<string, unknown>): Promise<Project> {
  const response = await fetch('/api/projects?stream=1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const raw = await response.text();
    let message = raw.slice(0, 200) || `请求失败 HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const data = JSON.parse(raw) as { error?: string; code?: string };
      if (typeof data.error === 'string') {
        message = data.error;
      }
      code = data.code;
    } catch {
      // 非 JSON
    }
    throw new ApiError(message, code);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let project: Project | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (event.type === 'status') {
        addProgressLabel.value = String(event.message || '');
        if (event.phase === 'install') {
          addCloneProgress.value = null;
        }
      } else if (event.type === 'clone-progress') {
        addCloneProgress.value = {
          stage: String(event.stage || ''),
          percent: Number(event.percent) || 0,
          received: Number(event.received) || 0,
          total: Number(event.total) || 0,
          remaining: Number(event.remaining) || 0,
          speed: typeof event.speed === 'string' ? event.speed : null,
        };
        const progress = addCloneProgress.value;
        addProgressLabel.value = `${gitStageLabel(progress.stage)} ${progress.percent}%`;
      } else if (event.type === 'install-log') {
        addInstallLog.value = String(event.line || '');
      } else if (event.type === 'done') {
        project = event.project as Project;
      } else if (event.type === 'error') {
        throw new ApiError(
          String(event.error || '登记失败'),
          typeof event.code === 'string' ? event.code : undefined,
        );
      }
    }
  }

  if (!project) {
    throw new ApiError('登记未返回项目结果');
  }
  return project;
}

/**
 * 提交添加仓库表单。
 *
 * @param event - 表单提交事件
 * @returns {Promise<void>}
 */
async function submitAdd(event: Event): Promise<void> {
  event.preventDefault();
  if (addSubmitting.value || busy.value) {
    return;
  }
  startAddProgress();
  busy.value = true;
  error.value = null;
  addError.value = null;
  try {
    const data = await addProjectWithProgress({
      repoUrl: repoUrl.value,
      branch: branch.value,
      startCommand: startCommand.value,
      upstreamUrl: upstreamUrl.value || null,
      openUrl: openUrl.value || null,
      tags: tagsInput.value,
      categoryId: categoryIdInput.value || null,
      skipInstall: true,
    });
    showAdd.value = false;
    repoUrl.value = '';
    openUrl.value = '';
    tagsInput.value = '';
    categoryIdInput.value = '';
    upstreamUrl.value = '';
    startCommand.value = '';
    branch.value = '';
    selectedId.value = data.id;
    await refreshAuth();
    await refresh();
    showToast('登记成功：请先安装依赖，再启动或构建');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    addError.value = message;
    error.value = message;
    maybeOpenUpgradeFromError(err);
  } finally {
    stopAddProgress();
    busy.value = false;
  }
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
 * 从 package.json 同步启动 / 构建模式到清单。
 *
 * @returns {Promise<void>}
 */
async function syncSelectedProfiles(): Promise<void> {
  if (!selected.value) {
    return;
  }
  const id = selected.value.id;
  await runAction(async () => {
    await api(`/api/projects/${id}/sync-profiles`, { method: 'POST' });
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
  await removeProjectById(selected.value.id);
}

/**
 * 按 id 从清单移除项目（默认不删磁盘）。
 *
 * @param projectId - 项目 id
 * @returns {Promise<void>}
 */
async function removeProjectById(projectId: string): Promise<void> {
  if (!window.confirm(`从清单移除 ${projectId}？（默认不删磁盘文件）`)) {
    return;
  }
  await runAction(async () => {
    await api(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (selectedId.value === projectId) {
      selectedId.value = null;
    }
  });
}

/**
 * 关闭右键菜单。
 *
 * @returns {void}
 */
function closeContextMenu(): void {
  contextMenu.value = null;
  contextMoveOpen.value = false;
  contextBranchOpen.value = false;
  contextBranches.value = [];
  contextBranchCurrent.value = null;
  contextBranchesLoading.value = false;
  contextBranchesError.value = null;
}

/**
 * 将菜单坐标限制在视口内。
 *
 * @param x - 鼠标 x
 * @param y - 鼠标 y
 * @param width - 菜单预估宽度
 * @param height - 菜单预估高度
 * @returns 修正后的坐标
 */
function clampMenuPosition(
  x: number,
  y: number,
  width = 180,
  height = 260,
): { x: number; y: number } {
  const pad = 8;
  const maxX = Math.max(pad, window.innerWidth - width - pad);
  const maxY = Math.max(pad, window.innerHeight - height - pad);
  return {
    x: Math.min(Math.max(pad, x), maxX),
    y: Math.min(Math.max(pad, y), maxY),
  };
}

/**
 * 打开项目右键菜单。
 *
 * @param project - 项目
 * @param event - 鼠标事件
 * @returns {void}
 */
function openProjectContextMenu(project: Project, event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  selectedId.value = project.id;
  const pos = clampMenuPosition(event.clientX, event.clientY, 200, 360);
  contextMenu.value = { kind: 'project', id: project.id, x: pos.x, y: pos.y };
  contextMoveOpen.value = false;
  contextBranchOpen.value = false;
  contextBranches.value = [];
  contextBranchCurrent.value = project.git?.branch ?? project.branch ?? null;
  contextBranchesError.value = null;
  if (project.exists && project.isGitRepo) {
    void loadContextBranches(project.id);
  }
}

/**
 * 加载右键菜单中的分支列表。
 *
 * @param projectId - 项目 id
 * @returns {Promise<void>}
 */
async function loadContextBranches(projectId: string): Promise<void> {
  contextBranchesLoading.value = true;
  contextBranchesError.value = null;
  try {
    const data = await api<{ current: string | null; branches: string[] }>(
      `/api/projects/${projectId}/branches`,
    );
    if (contextMenu.value?.kind === 'project' && contextMenu.value.id === projectId) {
      contextBranches.value = data.branches;
      contextBranchCurrent.value = data.current;
    }
  } catch (err) {
    if (contextMenu.value?.kind === 'project' && contextMenu.value.id === projectId) {
      contextBranchesError.value = err instanceof Error ? err.message : String(err);
    }
  } finally {
    if (contextMenu.value?.kind === 'project' && contextMenu.value.id === projectId) {
      contextBranchesLoading.value = false;
    }
  }
}

/**
 * 从右键菜单切换分支。
 *
 * @param branchName - 目标分支
 * @returns {Promise<void>}
 */
async function checkoutContextBranch(branchName: string): Promise<void> {
  const project = contextProject.value;
  if (!project) {
    return;
  }
  if (branchName === (contextBranchCurrent.value || project.git?.branch)) {
    closeContextMenu();
    return;
  }
  closeContextMenu();
  startSwitchProgress(project.name || project.id, branchName);
  busy.value = true;
  error.value = null;
  try {
    await checkoutBranchWithProgress(project.id, branchName);
    await refresh();
    showToast(`已切换到分支 ${branchName}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    stopSwitchProgress();
    busy.value = false;
  }
}

/**
 * 开始切换分支进度提示。
 *
 * @param projectName - 项目名
 * @param branchName - 目标分支
 * @returns {void}
 */
function startSwitchProgress(projectName: string, branchName: string): void {
  stopSwitchProgress();
  switchJobOpen.value = true;
  switchJobTitle.value = `${projectName} → ${branchName}`;
  switchJobLabel.value = `正在切换到分支 ${branchName}…`;
  switchJobElapsed.value = 0;
  switchJobProgress.value = null;
  switchElapsedTimer = window.setInterval(() => {
    switchJobElapsed.value += 1;
  }, 1000);
}

/**
 * 停止切换分支进度提示。
 *
 * @returns {void}
 */
function stopSwitchProgress(): void {
  switchJobOpen.value = false;
  if (switchElapsedTimer !== undefined) {
    window.clearInterval(switchElapsedTimer);
    switchElapsedTimer = undefined;
  }
}

/**
 * 以 NDJSON 流方式切换分支，并更新进度 UI。
 *
 * @param projectId - 项目 id
 * @param branchName - 目标分支
 * @returns {Promise<void>}
 * @throws {ApiError} 失败时抛出
 */
async function checkoutBranchWithProgress(projectId: string, branchName: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/checkout?stream=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify({ branch: branchName }),
  });

  if (!response.ok || !response.body) {
    const raw = await response.text();
    let message = raw.slice(0, 200) || `切换失败 HTTP ${response.status}`;
    try {
      const data = JSON.parse(raw) as { error?: string };
      if (typeof data.error === 'string') {
        message = data.error;
      }
    } catch {
      // 非 JSON
    }
    throw new ApiError(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let gotDone = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (event.type === 'status') {
        switchJobLabel.value = String(event.message || '');
        if (event.phase === 'done') {
          switchJobProgress.value = null;
        }
      } else if (event.type === 'clone-progress') {
        switchJobProgress.value = {
          stage: String(event.stage || ''),
          percent: Number(event.percent) || 0,
          received: Number(event.received) || 0,
          total: Number(event.total) || 0,
          remaining: Number(event.remaining) || 0,
          speed: typeof event.speed === 'string' ? event.speed : null,
        };
        const progress = switchJobProgress.value;
        switchJobLabel.value = `${gitStageLabel(progress.stage)} ${progress.percent}%`;
      } else if (event.type === 'done') {
        gotDone = true;
      } else if (event.type === 'error') {
        throw new ApiError(String(event.error || '切换分支失败'));
      }
    }
  }

  if (!gotDone) {
    throw new ApiError('切换分支未完成');
  }
}

/**
 * 打开分类右键菜单。
 *
 * @param group - 分组
 * @param event - 鼠标事件
 * @returns {void}
 */
function openCategoryContextMenu(group: ProjectGroup, event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  const pos = clampMenuPosition(event.clientX, event.clientY, 180, 200);
  contextMenu.value = { kind: 'category', id: group.id, x: pos.x, y: pos.y };
  contextMoveOpen.value = false;
}

/**
 * 当前右键菜单对应的项目。
 *
 * @returns 项目或 null
 */
const contextProject = computed(() => {
  if (contextMenu.value?.kind !== 'project') {
    return null;
  }
  return projects.value.find((item) => item.id === contextMenu.value?.id) ?? null;
});

/**
 * 当前右键菜单对应的分类分组。
 *
 * @returns 分组或 null
 */
const contextCategoryGroup = computed(() => {
  if (contextMenu.value?.kind !== 'category') {
    return null;
  }
  return projectGroups.value.find((item) => item.id === contextMenu.value?.id) ?? null;
});

/**
 * 移动项目到指定分类（空字符串表示未分类）。
 *
 * @param projectId - 项目 id
 * @param categoryId - 分类 id 或空
 * @returns {Promise<void>}
 */
async function moveProjectToCategory(projectId: string, categoryId: string): Promise<void> {
  closeContextMenu();
  await runAction(async () => {
    await api(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ categoryId: categoryId || null }),
    });
  });
}

/**
 * 打开重命名项目弹窗。
 *
 * @param project - 项目
 * @returns {void}
 */
function openRenameProject(project: Project): void {
  closeContextMenu();
  renameProjectId.value = project.id;
  renameProjectDraft.value = project.name;
  showRenameProject.value = true;
}

/**
 * 提交项目重命名。
 *
 * @param event - 表单事件
 * @returns {Promise<void>}
 */
async function submitRenameProject(event: Event): Promise<void> {
  event.preventDefault();
  const id = renameProjectId.value;
  const name = renameProjectDraft.value.trim();
  if (!id || !name) {
    return;
  }
  await runAction(async () => {
    await api(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    showRenameProject.value = false;
    renameProjectId.value = null;
    renameProjectDraft.value = '';
  });
}

/**
 * 在指定分类下打开添加仓库。
 *
 * @param categoryId - 分类 id；未分类传空
 * @returns {void}
 */
function openAddProjectInCategory(categoryId: string): void {
  closeContextMenu();
  if (projectAtLimit.value) {
    openUpgrade('project');
    return;
  }
  categoryIdInput.value = categoryId === UNCATEGORIZED_ID ? '' : categoryId;
  remoteBranches.value = [];
  remoteDefaultBranch.value = null;
  remoteBranchesError.value = null;
  branch.value = '';
  showAdd.value = true;
}

/**
 * 全局点击 / Esc 关闭右键菜单。
 *
 * @param event - 事件
 * @returns {void}
 */
function onGlobalPointerDown(event: Event): void {
  if (!contextMenu.value) {
    return;
  }
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('[data-context-menu]')) {
    return;
  }
  closeContextMenu();
}

/**
 * Esc 关闭右键菜单。
 *
 * @param event - 键盘事件
 * @returns {void}
 */
function onGlobalKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeContextMenu();
  }
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
 * 保存当前选中项目的归属分类。
 *
 * @returns {Promise<void>}
 */
async function saveSelectedCategory(): Promise<void> {
  if (!selected.value) {
    return;
  }
  const id = selected.value.id;
  await runAction(async () => {
    await api(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ categoryId: categoryIdDraft.value || null }),
    });
  });
}

/**
 * 打开新建分类弹窗。
 *
 * @returns {void}
 */
function openCreateCategory(): void {
  closeContextMenu();
  categoryModalMode.value = 'create';
  categoryModalTargetId.value = null;
  categoryNameDraft.value = '';
  showCategoryModal.value = true;
}

/**
 * 打开重命名分类弹窗。
 *
 * @param categoryId - 分类 id
 * @param event - 可选点击事件
 * @returns {void}
 */
function openRenameCategory(categoryId: string, event?: Event): void {
  event?.stopPropagation();
  closeContextMenu();
  const category = categories.value.find((item) => item.id === categoryId);
  if (!category) {
    return;
  }
  categoryModalMode.value = 'rename';
  categoryModalTargetId.value = categoryId;
  categoryNameDraft.value = category.name;
  showCategoryModal.value = true;
}

/**
 * 提交分类新建 / 重命名。
 *
 * @param event - 表单事件
 * @returns {Promise<void>}
 */
async function submitCategoryModal(event: Event): Promise<void> {
  event.preventDefault();
  const name = categoryNameDraft.value.trim();
  if (!name) {
    return;
  }
  const mode = categoryModalMode.value;
  await runAction(async () => {
    if (mode === 'create') {
      const data = await api<{ category: Category }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      // 添加仓库弹窗打开时，新建后自动选中该分类
      if (showAdd.value && data.category?.id) {
        categoryIdInput.value = data.category.id;
      }
      if (selectedId.value && !showAdd.value) {
        categoryIdDraft.value = data.category.id;
      }
    } else if (categoryModalTargetId.value) {
      await api(`/api/categories/${categoryModalTargetId.value}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
    }
    showCategoryModal.value = false;
    categoryNameDraft.value = '';
    categoryModalTargetId.value = null;
  });
}

/**
 * 删除分类（其下项目变为未分类）。
 *
 * @param categoryId - 分类 id
 * @param event - 可选点击事件
 * @returns {Promise<void>}
 */
async function deleteCategoryById(categoryId: string, event?: Event): Promise<void> {
  event?.stopPropagation();
  closeContextMenu();
  const category = categories.value.find((item) => item.id === categoryId);
  if (!category) {
    return;
  }
  if (!window.confirm(`删除分类「${category.name}」？其下项目将变为未分类。`)) {
    return;
  }
  await runAction(async () => {
    await api(`/api/categories/${categoryId}`, { method: 'DELETE' });
    if (categoryIdDraft.value === categoryId) {
      categoryIdDraft.value = '';
    }
    if (categoryIdInput.value === categoryId) {
      categoryIdInput.value = '';
    }
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
  closeContextMenu();
  selectedId.value = projectId;
  detailTab.value = 'analysis';
  void refreshAnalysis(projectId);
}

/**
 * 从右键菜单启停项目。
 *
 * @returns {Promise<void>}
 */
async function toggleContextProject(): Promise<void> {
  const project = contextProject.value;
  if (!project) {
    return;
  }
  closeContextMenu();
  const running =
    project.runtime.status === 'running' || project.runtime.status === 'starting';
  if (!running && project.needsInstall) {
    selectedId.value = project.id;
    error.value = '请先安装依赖，完成后再启动项目';
    showToast('请先安装依赖');
    return;
  }
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
 * 从右键菜单移除项目。
 *
 * @returns {Promise<void>}
 */
async function removeContextProject(): Promise<void> {
  const project = contextProject.value;
  if (!project) {
    return;
  }
  closeContextMenu();
  await removeProjectById(project.id);
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

const logLinkTitle = /Mac|iPhone|iPad/.test(navigator.platform)
  ? '⌘+点击打开'
  : 'Ctrl+点击打开';

/**
 * 将日志行拆成文本与可点击 URL。
 *
 * @param text - 原始日志（可含 ANSI）
 * @returns 展示片段
 */
function logLineParts(text: string): LogTextPart[] {
  return splitLogTextWithUrls(stripAnsi(text));
}

/**
 * 控制台链接：Ctrl/⌘+点击或普通点击均在新标签打开，避免离开控制台。
 *
 * @param event - 点击事件
 */
function onLogLinkClick(event: MouseEvent): void {
  const fromCurrent =
    event.currentTarget instanceof HTMLAnchorElement ? event.currentTarget : null;
  const fromTarget =
    event.target instanceof Element ? event.target.closest('a') : null;
  const anchor = fromCurrent ?? fromTarget;
  if (!anchor?.href) {
    return;
  }
  event.preventDefault();
  window.open(anchor.href, '_blank', 'noopener,noreferrer');
}

/**
 * 汇总项目访问地址：日志探测优先，登记 openUrl 作补充。
 *
 * @param project - 项目视图
 * @returns 可打开的 URL 列表
 */
function projectUrls(project: Project): string[] {
  const detected = (project.profileRuntimes ?? []).flatMap((item) => item.runtimeUrls ?? []);
  const fromProject = project.runtimeUrls ?? [];
  const configured = [
    project.openUrl,
    ...(project.profileRuntimes ?? []).map((item) => item.profile.openUrl ?? null),
  ];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of [...detected, ...fromProject, ...configured]) {
    if (!item || seen.has(item)) {
      continue;
    }
    seen.add(item);
    urls.push(item);
  }
  return urls;
}

/**
 * 某启动模式「日志探测到」的地址。
 *
 * @param item - 模式运行视图
 * @returns URL 列表
 */
function profileDetectedUrls(item: ProfileRuntimeView): string[] {
  return item.runtimeUrls ?? [];
}

/**
 * 比较两个运行地址是否为同一处（localhost / 127.0.0.1 视为相同）。
 *
 * @param left - 地址 A
 * @param right - 地址 B
 * @returns 是否同一地址
 */
function sameRuntimeUrl(left: string, right: string): boolean {
  const normalize = (url: string) =>
    url
      .trim()
      .replace(/\/$/, '')
      .replace(/:\/\/localhost/gi, '://127.0.0.1')
      .replace(/:\/\/0\.0\.0\.0/gi, '://127.0.0.1')
      .toLowerCase();
  return normalize(left) === normalize(right);
}

/**
 * 某启动模式仅登记、尚未被探测覆盖的地址。
 *
 * @param item - 模式运行视图
 * @returns URL 列表
 */
function profileConfiguredOnlyUrls(item: ProfileRuntimeView): string[] {
  const openUrl = item.profile.openUrl;
  if (!openUrl) {
    return [];
  }
  const detected = profileDetectedUrls(item);
  return detected.some((url) => sameRuntimeUrl(url, openUrl)) ? [] : [openUrl];
}

/**
 * 项目级：是否已有日志探测地址。
 *
 * @param project - 项目
 * @returns 是否有探测结果
 */
function hasDetectedUrls(project: Project): boolean {
  return (project.profileRuntimes ?? []).some((item) => (item.runtimeUrls?.length ?? 0) > 0);
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
  window.addEventListener('pointerdown', onGlobalPointerDown, true);
  window.addEventListener('keydown', onGlobalKeydown);
  void (async () => {
    await refreshAuth();
    if (authLoggedIn.value) {
      await refresh();
      projectsTimer = window.setInterval(() => void refresh(true), 3000);
    }
  })();
});

onUnmounted(() => {
  window.removeEventListener('pointerdown', onGlobalPointerDown, true);
  window.removeEventListener('keydown', onGlobalKeydown);
  if (projectsTimer !== undefined) {
    window.clearInterval(projectsTimer);
  }
  if (logsTimer !== undefined) {
    window.clearInterval(logsTimer);
  }
  if (smsTimer !== undefined) {
    window.clearInterval(smsTimer);
  }
  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer);
  }
  if (remoteBranchesTimer !== undefined) {
    window.clearTimeout(remoteBranchesTimer);
  }
  stopAddProgress();
  stopSwitchProgress();
});

watch(repoUrl, (url) => {
  if (!showAdd.value) {
    return;
  }
  scheduleFetchRemoteBranches(url);
});

watch(showAdd, (open) => {
  if (open && repoUrl.value.trim()) {
    scheduleFetchRemoteBranches(repoUrl.value);
  }
  if (!open) {
    remoteBranches.value = [];
    remoteDefaultBranch.value = null;
    remoteBranchesError.value = null;
    remoteBranchesLoading.value = false;
    addError.value = null;
    if (!addSubmitting.value) {
      stopAddProgress();
    }
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
      categoryIdDraft.value = '';
      detailTab.value = 'logs';
      return;
    }
    const project = projects.value.find((item) => item.id === id);
    tagsDraft.value = (project?.tags ?? []).join(', ');
    categoryIdDraft.value = project?.categoryId ?? '';
    buildProfileId.value =
      project?.defaultBuildProfileId || project?.buildProfiles?.[0]?.id || '';
    detailTab.value = project?.hasAnalysis ? 'analysis' : 'logs';
    void refreshLogs(id);
    void refreshAnalysis(id);
    logsTimer = window.setInterval(() => void refreshLogs(id), 2000);
  },
  { immediate: true },
);

/** 列表刷新后同步详情区分类草稿 */
watch(
  () => selected.value?.categoryId,
  (categoryId) => {
    if (selectedId.value) {
      categoryIdDraft.value = categoryId ?? '';
    }
  },
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
        <p v-if="labhubRepoUrl" class="mt-1.5 text-center">
          <a
            class="mono text-xs text-[var(--accent)] hover:underline"
            :href="labhubRepoUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="labhubRepoUrl"
            @click="onLogLinkClick"
          >{{ labhubRepoUrl }}</a>
        </p>
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
            <button
              type="button"
              class="text-[var(--accent)] hover:underline"
              @click.prevent="openLegalDoc('terms')"
            >
              服务条款
            </button>
            和
            <button
              type="button"
              class="text-[var(--accent)] hover:underline"
              @click.prevent="openLegalDoc('privacy')"
            >
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
        <div class="flex flex-wrap items-baseline gap-3">
          <h1 class="text-xl font-semibold tracking-tight">LabHub</h1>
          <p class="hidden text-sm text-[var(--muted)] sm:block">多仓库启停与日志监控</p>
          <a
            v-if="labhubRepoUrl"
            class="mono max-w-[min(100%,28rem)] truncate text-xs text-[var(--accent)] hover:underline"
            :href="labhubRepoUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="labhubRepoUrl"
            @click="onLogLinkClick"
          >
            {{ labhubRepoUrl }}
          </a>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <div
          v-if="authUser"
          class="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] bg-[#0b1016]/60 px-3 py-1.5 text-xs"
        >
          <span>{{ authUser.phoneMasked }}</span>
          <button
            type="button"
            class="rounded border border-[var(--accent)]/40 px-1.5 py-0.5 text-[var(--accent)] hover:bg-[var(--accent)]/10"
            :title="authUser.planExpiresAt ? `到期 ${authUser.planExpiresAt.slice(0, 10)}` : '当前套餐'"
            @click="openUpgrade('general')"
          >
            {{ planSummary }}
          </button>
          <span
            v-if="authUser.projectLimit != null"
            class="text-[var(--muted)]"
            :class="projectAtLimit ? 'text-[var(--danger)]' : ''"
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
            v-if="authUser.inviteCode"
            type="button"
            class="rounded border border-[var(--line)] px-2 py-0.5 text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
            :title="`邀请码 ${authUser.inviteCode}（点击复制）`"
            @click="copyInviteCode"
          >
            邀请码
          </button>
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
            class="rounded border border-[var(--line)] px-2 py-0.5 text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
            :disabled="busy"
            title="用 Cursor 多根工作区打开，源代码管理才能看到 projects 下托管仓"
            @click="openGitWorkspace"
          >
            打开 Git 工作区
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
          <div class="flex items-end gap-2">
            <label class="min-w-0 flex-1 block text-[11px] text-[var(--muted)]">
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
            <button
              type="button"
              :disabled="busy"
              class="shrink-0 rounded border border-[var(--line)] px-2 py-1.5 text-[11px] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)] disabled:opacity-40"
              title="新建分类"
              @click="openCreateCategory"
            >
              新建分类
            </button>
          </div>
        </div>

        <div
          class="min-h-0 flex-1 overflow-y-auto p-2"
          :class="sidebarCollapsed ? 'lg:hidden' : ''"
        >
          <div
            v-if="filteredProjects.length === 0 && (nameFilterId || categories.length === 0)"
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
            v-for="group in projectGroups"
            :key="group.id"
            class="mb-2"
          >
            <div
              class="mb-1 flex items-center gap-1"
              @contextmenu="openCategoryContextMenu(group, $event)"
            >
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] font-medium text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                @click="toggleCategoryCollapsed(group.id)"
              >
                <span class="mono w-3 shrink-0 text-[10px] opacity-70">
                  {{ isCategoryCollapsed(group.id) ? '▸' : '▾' }}
                </span>
                <span class="truncate">{{ group.name }}</span>
                <span class="mono shrink-0 text-[10px] opacity-60">{{ group.projects.length }}</span>
              </button>
            </div>

            <div v-show="!isCategoryCollapsed(group.id)">
              <div
                v-if="group.projects.length === 0"
                class="mb-2 rounded-md border border-dashed border-[var(--line)] px-3 py-2 text-[11px] text-[var(--muted)]"
              >
                暂无项目
              </div>
              <div
                v-for="project in group.projects"
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
                @contextmenu="openProjectContextMenu(project, $event)"
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
                    <div
                      v-for="row in [cardTagRow(project)]"
                      :key="`${project.id}-tags`"
                      v-show="row.branch || row.visible.length"
                      class="mt-1.5 flex flex-wrap items-center gap-1"
                    >
                      <span
                        v-if="row.branch"
                        class="mono rounded border border-[var(--accent)]/45 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]"
                        :title="`当前分支 ${row.branch}`"
                      >
                        {{ row.branch }}
                      </span>
                      <span
                        v-for="tag in row.visible"
                        :key="tag"
                        class="rounded bg-[#0b1016] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                      >
                        {{ tag }}
                      </span>
                      <span
                        v-if="row.hasMore"
                        class="rounded bg-[#0b1016] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                        :title="(project.tags ?? []).join('、')"
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
                    :disabled="busy || !project.exists || project.needsInstall"
                    class="shrink-0 rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                    :class="toneClass('ok')"
                    :title="project.needsInstall ? '请先安装依赖' : '启动'"
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
                  v-if="!detailMetaCollapsed && selected.repoUrl"
                  class="mt-0.5 break-all text-xs text-[var(--muted)]"
                >
                  远程仓库
                  <a
                    class="mono log-link"
                    :href="selected.repoUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    :title="logLinkTitle"
                    @click="onLogLinkClick"
                  >{{ selected.repoUrl }}</a>
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
                  :class="
                    selected.needsInstall
                      ? 'border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)]'
                      : toneClass()
                  "
                  :title="selected.needsInstall ? '拉取后请先安装依赖' : '安装依赖'"
                  @click="installSelected"
                >
                  {{ selected.needsInstall ? '① 安装依赖' : '安装依赖' }}
                </button>
                <select
                  :value="buildProfileId"
                  :disabled="
                    busy ||
                    !selected.exists ||
                    selected.needsInstall ||
                    !(selected.buildProfiles?.length)
                  "
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
                  :disabled="
                    busy || !selected.exists || selected.needsInstall || !buildProfileId
                  "
                  class="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  :class="toneClass('ok')"
                  :title="selected.needsInstall ? '请先安装依赖' : '构建'"
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
              <div
                v-else-if="selected.needsInstall"
                class="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-[var(--warn)]/40 bg-[#3a3420]/50 px-3 py-2 text-xs text-[var(--warn)]"
              >
                <span>拉取后请先安装依赖，否则无法启动与构建。</span>
                <button
                  type="button"
                  class="rounded border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-2 py-1 text-[11px] font-medium text-[var(--accent)] hover:brightness-110 disabled:opacity-40"
                  :disabled="busy"
                  @click="installSelected"
                >
                  立即安装
                </button>
              </div>
              <div v-if="projectUrls(selected).length" class="mt-2 space-y-1">
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span class="text-xs text-[var(--muted)]">
                    {{ hasDetectedUrls(selected) ? '运行地址（探测优先）' : '运行地址' }}
                  </span>
                  <a
                    v-for="url in projectUrls(selected)"
                    :key="url"
                    :href="url"
                    target="_blank"
                    rel="noreferrer"
                    class="mono text-xs log-link"
                    :title="logLinkTitle"
                    @click="onLogLinkClick"
                  >
                    {{ url }}
                  </a>
                </div>
                <p v-if="hasDetectedUrls(selected)" class="text-[11px] text-[var(--muted)]">
                  已从日志解析真实地址；若框架自动换端口，以探测结果为准。
                </p>
              </div>
              <p v-else class="mt-2 text-xs text-[var(--muted)]">
                暂无运行地址：启动后会从日志自动探测 Local / Server 地址；也可在启动模式中预登记 openUrl。
              </p>
              <p v-if="selected.git?.head" class="mt-1 text-xs text-[var(--muted)]">
                {{ selected.git.branch }}@{{ selected.git.head }}{{ selected.git.dirty ? ' *' : '' }}
              </p>
              <div class="mt-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs text-[var(--muted)]">启动模式（可并行）</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      :disabled="busy || !selected.exists"
                      class="rounded border px-2 py-0.5 text-[11px] font-medium disabled:opacity-40"
                      :class="toneClass()"
                      title="从 package.json 或 Python 清单同步启动/构建模式"
                      @click="syncSelectedProfiles"
                    >
                      从脚本同步
                    </button>
                    <span class="mono text-[11px] text-[var(--muted)]">{{ selected.installCommand }}</span>
                  </div>
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
                      <div
                        v-if="profileDetectedUrls(item).length"
                        class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1"
                      >
                        <span class="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                          已探测
                        </span>
                        <a
                          v-for="url in profileDetectedUrls(item)"
                          :key="url"
                          :href="url"
                          target="_blank"
                          rel="noreferrer"
                          class="mono text-[11px] log-link"
                          :title="logLinkTitle"
                          @click="onLogLinkClick"
                        >
                          {{ url }}
                        </a>
                      </div>
                      <div
                        v-else-if="profileConfiguredOnlyUrls(item).length"
                        class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1"
                      >
                        <span class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                          登记
                        </span>
                        <a
                          v-for="url in profileConfiguredOnlyUrls(item)"
                          :key="url"
                          :href="url"
                          target="_blank"
                          rel="noreferrer"
                          class="mono text-[11px] log-link"
                          :title="logLinkTitle"
                          @click="onLogLinkClick"
                        >
                          {{ url }}
                        </a>
                        <span class="text-[10px] text-[var(--muted)]">启动后以日志探测为准</span>
                      </div>
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
                        :disabled="busy || !selected.exists || selected.needsInstall"
                        class="rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                        :class="toneClass('ok')"
                        :title="selected.needsInstall ? '请先安装依赖' : '启动'"
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
                        :disabled="busy || !selected.exists || selected.needsInstall"
                        class="rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                        :class="toneClass('ok')"
                        :title="selected.needsInstall ? '请先安装依赖' : '构建'"
                        @click="buildSelected(item.id)"
                      >
                        构建
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="text-xs text-[var(--muted)]">项目分类</span>
                <select
                  v-model="categoryIdDraft"
                  class="min-w-[10rem] rounded border border-[var(--line)] bg-[#0b1016] px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                >
                  <option value="">未分类（可不选）</option>
                  <option
                    v-for="item in categories"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                  </option>
                </select>
                <button
                  type="button"
                  :disabled="busy"
                  class="rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-40"
                  :class="toneClass()"
                  @click="saveSelectedCategory"
                >
                  保存分类
                </button>
                <button
                  type="button"
                  :disabled="busy"
                  class="rounded border px-2 py-1 text-[11px] font-medium text-[var(--muted)] disabled:opacity-40"
                  :class="toneClass()"
                  @click="openCreateCategory"
                >
                  新建
                </button>
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
                <span class="text-xs text-[var(--muted)]">自动刷新 · 近 300 行 · {{ logLinkTitle }}</span>
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
                <template v-for="(part, partIndex) in logLineParts(line.text)" :key="partIndex">
                  <a
                    v-if="part.type === 'url'"
                    :href="part.value"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="log-link"
                    :title="logLinkTitle"
                    @click="onLogLinkClick"
                  >{{ part.value }}</a>
                  <span v-else>{{ part.value }}</span>
                </template>
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
                @click="onLogLinkClick"
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

        <div
          v-if="authUser?.inviteCode"
          class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]"
        >
          <span>
            邀请好友注册双方项目额度各 +1（不替代付费）。我的邀请码：
            <span class="mono text-[var(--text)]">{{ authUser.inviteCode }}</span>
          </span>
          <button
            type="button"
            class="rounded border border-[var(--line)] px-2 py-0.5 hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
            @click="copyInviteCode"
          >
            复制
          </button>
        </div>

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
        class="relative w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl"
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
            :disabled="addSubmitting"
            @click="openUpgrade('project')"
          >
            查看升级
          </button>
        </p>
        <p
          v-if="addError"
          class="mt-3 rounded-md border border-[var(--danger)]/40 bg-[#3a2220] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {{ addError }}
        </p>
        <div
          v-if="addSubmitting"
          class="mt-3 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-3"
        >
          <div class="flex items-start gap-3">
            <span
              class="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-[var(--text)]">{{ addProgressLabel || '处理中…' }}</p>
              <template v-if="addCloneProgress">
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0b1016]">
                  <div
                    class="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
                    :style="{ width: `${Math.min(100, addCloneProgress.percent)}%` }"
                  />
                </div>
                <p class="mt-1.5 text-xs text-[var(--muted)]">
                  已下载
                  <span class="mono text-[var(--text)]">{{ addCloneProgress.received }}</span>
                  /
                  <span class="mono text-[var(--text)]">{{ addCloneProgress.total }}</span>
                  ，剩余
                  <span class="mono text-[var(--text)]">{{ addCloneProgress.remaining }}</span>
                  <span v-if="addCloneProgress.speed"> · {{ addCloneProgress.speed }}</span>
                </p>
              </template>
              <p
                v-else-if="addInstallLog"
                class="mono mt-1.5 truncate text-xs text-[var(--muted)]"
                :title="addInstallLog"
              >
                {{ addInstallLog }}
              </p>
              <p class="mt-1 text-xs text-[var(--muted)]">
                已用时 {{ addProgressElapsed }} 秒 · 请勿关闭
              </p>
            </div>
          </div>
        </div>
        <fieldset
          class="mt-1 min-w-0 border-0 p-0 disabled:opacity-60"
          :disabled="addSubmitting"
        >
          <label class="mt-3 block text-sm">
            仓库 URL
            <input
              v-model="repoUrl"
              required
              placeholder="https://github.com/org/repo.git"
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label class="mt-3 block text-sm">
            分支（可选）
            <select
              v-if="remoteBranches.length > 0"
              v-model="branch"
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
            >
              <option value="">自动（优先默认分支）</option>
              <option
                v-for="item in remoteBranches"
                :key="item"
                :value="item"
              >
                {{ item }}{{ item === remoteDefaultBranch ? '（默认）' : '' }}
              </option>
            </select>
            <input
              v-else
              v-model="branch"
              :placeholder="
                remoteBranchesLoading
                  ? '正在读取远程分支…'
                  : '留空自动识别；也可填 main / master'
              "
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
            <p
              v-if="remoteBranchesLoading"
              class="mt-1 text-xs text-[var(--muted)]"
            >
              正在探测远程分支…
            </p>
            <p
              v-else-if="remoteBranchesError"
              class="mt-1 text-xs text-[var(--warn)]"
            >
              {{ remoteBranchesError }}（仍可手动填写分支）
            </p>
            <p
              v-else-if="remoteBranches.length > 0"
              class="mt-1 text-xs text-[var(--muted)]"
            >
              已探测到 {{ remoteBranches.length }} 个分支
            </p>
          </label>
          <label class="mt-3 block text-sm">
            启动命令（可选）
            <input
              v-model="startCommand"
              placeholder="留空则导入后自动分析"
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <div class="mt-3">
            <div class="flex items-center justify-between gap-2 text-sm">
              <span>项目分类（可选）</span>
              <button
                type="button"
                class="text-xs text-[var(--accent)] hover:underline disabled:opacity-40"
                :disabled="addSubmitting"
                @click="openCreateCategory"
              >
                新建分类
              </button>
            </div>
            <select
              v-model="categoryIdInput"
              class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">未分类（可不选）</option>
              <option
                v-for="item in categories"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select>
            <p class="mt-1 text-xs text-[var(--muted)]">
              {{
                categories.length === 0
                  ? '暂无分类，可点右上角新建，或稍后在详情里调整'
                  : `可选 ${categories.length} 个分类，不选则放入「未分类」`
              }}
            </p>
          </div>
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
        </fieldset>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-white disabled:opacity-40"
            :disabled="addSubmitting"
            @click="showAdd = false; addError = null"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="addSubmitting || busy || !repoUrl.trim()"
            class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06221f] disabled:opacity-50"
          >
            {{ addSubmitting ? '处理中…' : '克隆并登记' }}
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="showCategoryModal"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      @click.self="showCategoryModal = false"
    >
      <form
        class="w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl"
        @submit="submitCategoryModal"
      >
        <h3 class="text-lg font-medium">
          {{ categoryModalMode === 'create' ? '新建分类' : '重命名分类' }}
        </h3>
        <label class="mt-4 block text-sm">
          分类名称
          <input
            v-model="categoryNameDraft"
            required
            maxlength="64"
            placeholder="如：生产工具、实验项目"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-white"
            @click="showCategoryModal = false"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="busy || !categoryNameDraft.trim()"
            class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06221f] disabled:opacity-50"
          >
            {{ categoryModalMode === 'create' ? '创建' : '保存' }}
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="showRenameProject"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="showRenameProject = false"
    >
      <form
        class="w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl"
        @submit="submitRenameProject"
      >
        <h3 class="text-lg font-medium">重命名项目</h3>
        <label class="mt-4 block text-sm">
          显示名称
          <input
            v-model="renameProjectDraft"
            required
            maxlength="64"
            class="mt-1 w-full rounded-lg border border-[var(--line)] bg-[#0b1016] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-white"
            @click="showRenameProject = false"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="busy || !renameProjectDraft.trim()"
            class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06221f] disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </div>

    <!-- 侧栏右键菜单 -->
    <div
      v-if="contextMenu"
      data-context-menu
      class="fixed z-[70] min-w-[11rem] rounded-lg border border-[var(--line)] bg-[var(--panel)] py-1 shadow-2xl"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @contextmenu.prevent
    >
      <template v-if="contextMenu.kind === 'project' && contextProject">
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5"
          @click="closeContextMenu(); selectedId = contextProject.id"
        >
          查看详情
        </button>
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5 disabled:opacity-40"
          :disabled="
            busy ||
            (!contextProject.exists && contextProject.runtime.status === 'stopped') ||
            (contextProject.needsInstall &&
              contextProject.runtime.status !== 'running' &&
              contextProject.runtime.status !== 'starting')
          "
          @click="toggleContextProject"
        >
          {{
            contextProject.runtime.status === 'running' ||
            contextProject.runtime.status === 'starting'
              ? '停止'
              : contextProject.needsInstall
                ? '请先安装依赖'
                : '启动'
          }}
        </button>
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5"
          @click="openRenameProject(contextProject)"
        >
          重命名
        </button>
        <div class="relative">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5 disabled:opacity-40"
            :disabled="!contextProject.exists || !contextProject.isGitRepo"
            @click="
              contextBranchOpen = !contextBranchOpen;
              contextMoveOpen = false;
              if (contextBranchOpen && contextBranches.length === 0 && !contextBranchesLoading) {
                void loadContextBranches(contextProject.id);
              }
            "
          >
            <span>
              分支
              <span
                v-if="contextBranchCurrent"
                class="mono text-[var(--muted)]"
              >
                · {{ contextBranchCurrent }}
              </span>
            </span>
            <span class="text-[var(--muted)]">{{ contextBranchOpen ? '▾' : '▸' }}</span>
          </button>
          <div
            v-if="contextBranchOpen"
            class="max-h-48 overflow-y-auto border-t border-[var(--line)] bg-[#0b1016]/80 py-1"
          >
            <p
              v-if="contextBranchesLoading"
              class="px-4 py-1.5 text-xs text-[var(--muted)]"
            >
              正在读取分支…
            </p>
            <p
              v-else-if="contextBranchesError"
              class="px-4 py-1.5 text-xs text-[var(--warn)]"
            >
              {{ contextBranchesError }}
            </p>
            <p
              v-else-if="contextBranches.length === 0"
              class="px-4 py-1.5 text-xs text-[var(--muted)]"
            >
              暂无分支
            </p>
            <button
              v-for="item in contextBranches"
              :key="item"
              type="button"
              class="block w-full px-4 py-1.5 text-left text-xs hover:bg-white/5"
              :class="
                item === contextBranchCurrent
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text)]'
              "
              :disabled="busy || item === contextBranchCurrent"
              @click="checkoutContextBranch(item)"
            >
              <span class="mono">{{ item }}</span>
              <span
                v-if="item === contextBranchCurrent"
                class="ml-1 text-[10px] opacity-80"
              >
                当前
              </span>
            </button>
          </div>
        </div>
        <div class="relative">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5"
            @click="contextMoveOpen = !contextMoveOpen; contextBranchOpen = false"
          >
            <span>移动到</span>
            <span class="text-[var(--muted)]">{{ contextMoveOpen ? '▾' : '▸' }}</span>
          </button>
          <div
            v-if="contextMoveOpen"
            class="border-t border-[var(--line)] bg-[#0b1016]/80 py-1"
          >
            <button
              type="button"
              class="block w-full px-4 py-1.5 text-left text-xs hover:bg-white/5"
              :class="
                !contextProject.categoryId
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text)]'
              "
              @click="moveProjectToCategory(contextProject.id, '')"
            >
              未分类
            </button>
            <button
              v-for="item in categories"
              :key="item.id"
              type="button"
              class="block w-full px-4 py-1.5 text-left text-xs hover:bg-white/5"
              :class="
                contextProject.categoryId === item.id
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text)]'
              "
              @click="moveProjectToCategory(contextProject.id, item.id)"
            >
              {{ item.name }}
            </button>
            <button
              type="button"
              class="mt-0.5 block w-full border-t border-[var(--line)] px-4 py-1.5 text-left text-xs text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
              @click="openCreateCategory"
            >
              新建分类…
            </button>
          </div>
        </div>
        <button
          v-if="contextProject.hasAnalysis"
          type="button"
          class="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5"
          @click="openAnalysis(contextProject.id)"
        >
          查看分析总结
        </button>
        <div class="my-1 border-t border-[var(--line)]" />
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"
          :disabled="busy"
          @click="removeContextProject"
        >
          移除登记
        </button>
      </template>

      <template v-else-if="contextMenu.kind === 'category' && contextCategoryGroup">
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5"
          @click="
            closeContextMenu();
            toggleCategoryCollapsed(contextCategoryGroup.id)
          "
        >
          {{ isCategoryCollapsed(contextCategoryGroup.id) ? '展开' : '收起' }}
        </button>
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5"
          @click="
            openAddProjectInCategory(
              contextCategoryGroup.isUncategorized ? '' : contextCategoryGroup.id,
            )
          "
        >
          在此添加仓库
        </button>
        <template v-if="!contextCategoryGroup.isUncategorized">
          <button
            type="button"
            class="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-white/5"
            @click="openRenameCategory(contextCategoryGroup.id)"
          >
            重命名
          </button>
          <div class="my-1 border-t border-[var(--line)]" />
          <button
            type="button"
            class="block w-full px-3 py-1.5 text-left text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"
            :disabled="busy"
            @click="deleteCategoryById(contextCategoryGroup.id)"
          >
            删除分类
          </button>
        </template>
        <button
          v-else
          type="button"
          class="block w-full px-3 py-1.5 text-left text-xs text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
          @click="openCreateCategory"
        >
          新建分类…
        </button>
      </template>
    </div>
    </template>

    <div
      v-if="legalDoc"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      @click.self="legalDoc = null"
    >
      <div class="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        <div class="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <h3 class="text-base font-medium">
            {{ legalDoc === 'terms' ? 'LabHub 服务条款' : 'LabHub 隐私协议' }}
          </h3>
          <button
            type="button"
            class="text-sm text-[var(--muted)] hover:text-[var(--text)]"
            @click="legalDoc = null"
          >
            关闭
          </button>
        </div>
        <div class="max-h-[calc(85vh-3.5rem)] space-y-3 overflow-y-auto px-5 py-4 text-sm leading-6 text-[var(--muted)]">
          <template v-if="legalDoc === 'terms'">
            <p class="text-[var(--text)]">生效说明：使用 LabHub 本机控制台及关联的 LabHub Cloud 服务，即表示你同意本条款。</p>
            <p>1. 服务内容：LabHub 提供本机多仓库登记、启停与日志查看；Cloud 提供账号、清单同步、套餐额度与（可选）AI 分析中继。</p>
            <p>2. 账号责任：你应妥善保管手机号与登录凭证；因凭证泄露导致的损失由你自行承担。</p>
            <p>3. 合理使用：不得利用本服务从事违法违规活动，不得攻击、滥用短信、AI 或接口配额。</p>
            <p>4. 本地与云端：业务代码默认保存在你的本机目录；云端主要保存账号、套餐与项目清单元数据，不代替你的 Git 远程托管。</p>
            <p>5. 套餐与费用：免费档与付费档权限以产品内展示为准；付费开通以订单与支付结果为准（当前可先使用模拟支付联调）。</p>
            <p>6. 免：本软件按「现状」提供；在法律允许范围内，我们对间接损失、数据丢失不作额外担保。请自行备份重要代码与配置。</p>
            <p>7. 变更：我们可能更新条款；重大变更将通过产品内提示。继续使用视为接受更新。</p>
          </template>
          <template v-else>
            <p class="text-[var(--text)]">我们重视你的隐私。本协议说明 LabHub / LabHub Cloud 如何处理相关信息。</p>
            <p>1. 收集范围：手机号、登录凭证摘要、邀请关系、项目清单元数据（如仓库地址、启停命令、标签）、套餐与 AI 用量、必要的设备/网络日志（如短信限流用 IP）。</p>
            <p>2. 不收集：默认不上传你仓库内的源代码到 Cloud；AI 分析仅在你触发且已登录、有配额时，按产品设计发送必要上下文。</p>
            <p>3. 用途：用于账号鉴权、清单同步、套餐与配额、安全风控、改进服务质量。</p>
            <p>4. 存储：本机登录态保存在本地；Cloud 数据保存在你部署的服务端数据库中。请自行保护服务器与密钥。</p>
            <p>5. 共享：未经你同意，不向无关第三方出售个人信息；仅为完成短信、支付等必要能力时，向相应服务商提供最少信息。</p>
            <p>6. 你的权利：可申请查阅、更正或注销账号相关数据（需按运营方流程核实身份）。</p>
            <p>7. 联系：隐私相关问题可通过产品内公示的联系方式与运营方沟通。</p>
          </template>
        </div>
      </div>
    </div>

    <div
      v-if="switchJobOpen"
      class="fixed inset-0 z-[65] flex items-center justify-center bg-black/55 p-4"
    >
      <div class="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
        <h3 class="text-lg font-medium">切换分支</h3>
        <p class="mt-1 text-sm text-[var(--muted)]">{{ switchJobTitle }}</p>
        <div class="mt-3 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-3">
          <div class="flex items-start gap-3">
            <span
              class="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-[var(--text)]">{{ switchJobLabel || '处理中…' }}</p>
              <template v-if="switchJobProgress">
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0b1016]">
                  <div
                    class="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
                    :style="{ width: `${Math.min(100, switchJobProgress.percent)}%` }"
                  />
                </div>
                <p class="mt-1.5 text-xs text-[var(--muted)]">
                  已下载
                  <span class="mono text-[var(--text)]">{{ switchJobProgress.received }}</span>
                  /
                  <span class="mono text-[var(--text)]">{{ switchJobProgress.total }}</span>
                  ，剩余
                  <span class="mono text-[var(--text)]">{{ switchJobProgress.remaining }}</span>
                  <span v-if="switchJobProgress.speed"> · {{ switchJobProgress.speed }}</span>
                </p>
              </template>
              <p class="mt-1 text-xs text-[var(--muted)]">
                已用时 {{ switchJobElapsed }} 秒 · 请勿关闭
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="toastMessage"
      class="pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm text-[var(--text)] shadow-xl"
    >
      {{ toastMessage }}
    </div>
  </div>
</template>
