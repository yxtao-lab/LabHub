<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { marked } from 'marked';
import { api, type LogLine, type Project, type RuntimeStatus } from './api';

type DetailTab = 'logs' | 'analysis';

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

const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g;

const projects = ref<Project[]>([]);
const selectedId = ref<string | null>(null);
const logs = ref<LogLine[]>([]);
const error = ref<string | null>(null);
const busy = ref(false);
const showAdd = ref(false);
const repoUrl = ref('');
const startCommand = ref('npm run dev');
const branch = ref('main');
const openUrl = ref('');
const upstreamUrl = ref('');
const tagsInput = ref('');
const tagsDraft = ref('');
const tagFilter = ref<string | null>(null);
const logPanel = ref<HTMLElement | null>(null);
const detailTab = ref<DetailTab>('logs');
const analysis = ref<ProjectAnalysis | null>(null);
const analysisLoading = ref(false);
const analysisHtml = ref('');

const selected = computed(
  () => projects.value.find((item) => item.id === selectedId.value) ?? null,
);

const runningCount = computed(
  () => projects.value.filter((item) => item.runtime.status === 'running').length,
);

const allTags = computed(() => {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const project of projects.value) {
    for (const tag of project.tags ?? []) {
      const key = tag.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      list.push(tag);
    }
  }
  return list.sort((a, b) => a.localeCompare(b, 'zh-CN'));
});

const filteredProjects = computed(() => {
  if (!tagFilter.value) {
    return projects.value;
  }
  const filter = tagFilter.value.toLowerCase();
  return projects.value.filter((item) =>
    (item.tags ?? []).some((tag) => tag.toLowerCase() === filter),
  );
});

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
    const data = await api<{ logs: LogLine[] }>(`/api/projects/${id}/logs?limit=300`);
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
 * 拉取选中项目的分析总结，并渲染为 HTML。
 *
 * @param id - 项目 id
 * @returns {Promise<void>}
 */
async function refreshAnalysis(id: string): Promise<void> {
  analysisLoading.value = true;
  try {
    const data = await api<{ analysis: ProjectAnalysis }>(`/api/projects/${id}/analysis`);
    analysis.value = data.analysis;
    if (data.analysis.exists && data.analysis.content) {
      analysisHtml.value = await marked.parse(data.analysis.content, { async: true });
    } else {
      analysisHtml.value = '';
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
  } finally {
    busy.value = false;
  }
}

/**
 * 启动或停止指定项目。
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
    await api(`/api/projects/${project.id}/${running ? 'stop' : 'start'}`, {
      method: 'POST',
    });
  });
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
 * 切换侧栏标签筛选；再次点击同一标签则取消筛选。
 *
 * @param tag - 分类标签
 * @returns {void}
 */
function toggleTagFilter(tag: string): void {
  tagFilter.value = tagFilter.value === tag ? null : tag;
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
 * 汇总项目的访问地址：配置的 openUrl + 日志探测结果（去重）。
 *
 * @param project - 项目视图
 * @returns 可打开的 URL 列表
 */
function projectUrls(project: Project): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of [project.openUrl, ...(project.runtimeUrls ?? [])]) {
    if (!item || seen.has(item)) {
      continue;
    }
    seen.add(item);
    urls.push(item);
  }
  return urls;
}

onMounted(() => {
  void refresh();
  projectsTimer = window.setInterval(() => void refresh(true), 3000);
});

onUnmounted(() => {
  if (projectsTimer !== undefined) {
    window.clearInterval(projectsTimer);
  }
  if (logsTimer !== undefined) {
    window.clearInterval(logsTimer);
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
    if (!id) {
      logs.value = [];
      tagsDraft.value = '';
      detailTab.value = 'logs';
      return;
    }
    const project = projects.value.find((item) => item.id === id);
    tagsDraft.value = (project?.tags ?? []).join(', ');
    detailTab.value = project?.hasAnalysis ? 'analysis' : 'logs';
    void refreshLogs(id);
    void refreshAnalysis(id);
    logsTimer = window.setInterval(() => void refreshLogs(id), 2000);
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <header
      class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel)]/80 px-5 py-3 backdrop-blur"
    >
      <div class="min-w-0">
        <div class="flex items-baseline gap-3">
          <h1 class="text-xl font-semibold tracking-tight">LabHub</h1>
          <p class="hidden text-sm text-[var(--muted)] sm:block">多仓库启停与日志监控</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="rounded-md border border-[var(--line)] bg-[#0b1016]/60 px-3 py-1.5 text-sm">
          <span class="text-[var(--muted)]">运行中</span>
          <span class="mono font-medium text-[var(--accent)]"> {{ runningCount }}</span>
          <span class="text-[var(--muted)]"> / {{ projects.length }}</span>
        </div>
        <button
          type="button"
          :disabled="busy"
          class="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06221f] hover:brightness-110 disabled:opacity-50"
          @click="showAdd = true"
        >
          添加仓库
        </button>
      </div>
    </header>

    <div
      v-if="error"
      class="shrink-0 border-b border-[var(--danger)]/30 bg-[#3a2220] px-5 py-2 text-sm text-[var(--danger)]"
    >
      {{ error }}
    </div>

    <div class="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside class="flex min-h-0 flex-col border-b border-[var(--line)] lg:border-r lg:border-b-0">
        <div
          class="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-4 py-2.5"
        >
          <h2 class="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">项目</h2>
          <span class="mono text-xs text-[var(--muted)]">{{ filteredProjects.length }}/{{ projects.length }}</span>
        </div>

        <div v-if="allTags.length" class="flex shrink-0 flex-wrap gap-1.5 border-b border-[var(--line)] px-3 py-2">
          <button
            type="button"
            class="rounded px-2 py-0.5 text-[11px]"
            :class="
              !tagFilter
                ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-white/5'
            "
            @click="tagFilter = null"
          >
            全部
          </button>
          <button
            v-for="tag in allTags"
            :key="tag"
            type="button"
            class="rounded px-2 py-0.5 text-[11px]"
            :class="
              tagFilter === tag
                ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                : 'bg-[#0b1016] text-[var(--muted)] hover:text-[var(--text)]'
            "
            @click="toggleTagFilter(tag)"
          >
            {{ tag }}
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <div
            v-if="filteredProjects.length === 0"
            class="rounded-lg border border-dashed border-[var(--line)] px-4 py-10 text-center"
          >
            <p class="text-sm font-medium">{{ projects.length === 0 ? '还没有托管项目' : '没有匹配该标签的项目' }}</p>
            <p class="mt-1 text-xs text-[var(--muted)]">
              {{ projects.length === 0 ? '添加 Git 地址，或运行 seed:demo' : '点击「全部」清除筛选' }}
            </p>
            <button
              v-if="projects.length === 0"
              type="button"
              class="mt-4 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06221f]"
              @click="showAdd = true"
            >
              添加仓库
            </button>
          </div>

          <div
            v-for="project in filteredProjects"
            :key="project.id"
            role="button"
            tabindex="0"
            class="mb-1 cursor-pointer rounded-lg border px-3 py-3 transition"
            :class="
              selectedId === project.id
                ? 'border-[var(--accent)]/45 bg-[var(--panel)]'
                : 'border-transparent hover:border-[var(--line)] hover:bg-[var(--panel)]/60'
            "
            @click="selectedId = project.id"
            @keydown.enter="selectedId = project.id"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate font-medium">{{ project.name }}</span>
                  <span
                    class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :class="statusClass(project.runtime.status)"
                  >
                    {{ statusLabel(project.runtime.status) }}
                  </span>
                </div>
                <div v-if="project.tags?.length" class="mt-1.5 flex flex-wrap gap-1">
                  <span
                    v-for="tag in project.tags"
                    :key="tag"
                    class="rounded bg-[#0b1016] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                  >
                    {{ tag }}
                  </span>
                </div>
                <p class="mono mt-1 truncate text-[11px] text-[var(--muted)]">{{ project.id }}</p>
                <button
                  v-if="project.hasAnalysis"
                  type="button"
                  class="mt-1 text-left text-[11px] text-[var(--accent)] underline-offset-2 hover:underline"
                  @click="openAnalysis(project.id, $event)"
                >
                  查看分析总结 →
                </button>
                <a
                  v-for="url in projectUrls(project).slice(0, 2)"
                  :key="url"
                  :href="url"
                  target="_blank"
                  rel="noreferrer"
                  class="mono mt-1 block truncate text-[11px] text-[var(--accent)] hover:underline"
                  @click.stop
                >
                  {{ url }}
                </a>
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
          </div>
        </div>
      </aside>

      <main class="flex min-h-0 min-w-0 flex-col">
        <div
          v-if="!selected"
          class="flex flex-1 items-center justify-center px-6 text-sm text-[var(--muted)]"
        >
          选择左侧项目查看详情与日志
        </div>

        <template v-else>
          <div
            class="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-3"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-medium">{{ selected.name }}</h3>
                <span
                  class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                  :class="statusClass(selected.runtime.status)"
                >
                  {{ statusLabel(selected.runtime.status) }}
                </span>
                <span v-if="selected.runtime.pid" class="mono text-xs text-[var(--muted)]">
                  pid {{ selected.runtime.pid }}
                </span>
              </div>
              <p class="mono mt-1 break-all text-xs text-[var(--muted)]">
                {{ selected.absolutePath }}
              </p>
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
                暂无运行地址：可在添加时填写，或等待日志出现 Local / Server 地址后自动探测。
              </p>
              <p class="mt-1 text-xs text-[var(--muted)]">
                <span class="mono">{{ selected.startCommand }}</span>
                <span v-if="selected.git?.head">
                  · {{ selected.git.branch }}@{{ selected.git.head
                  }}{{ selected.git.dirty ? ' *' : '' }}
                </span>
              </p>
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
            <div class="flex flex-wrap gap-2">
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

          <p v-if="selected.runtime.error" class="shrink-0 px-5 py-2 text-sm text-[var(--danger)]">
            {{ selected.runtime.error }}
          </p>

          <div class="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
            <div class="mb-2 flex items-center justify-between gap-3 px-1">
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
              <span v-if="detailTab === 'logs'" class="text-xs text-[var(--muted)]">
                自动刷新 · 近 300 行
              </span>
              <span v-else-if="analysis?.updatedAt" class="text-xs text-[var(--muted)]">
                更新于 {{ analysis.updatedAt.slice(0, 19).replace('T', ' ') }}
              </span>
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
                <p>尚未生成项目分析总结。</p>
                <p class="mono mt-2 text-xs">
                  约定路径：{{ analysis?.relativePath ?? 'docs/项目分析总结.md' }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </main>
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
  </div>
</template>
