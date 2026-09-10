import fs from 'node:fs';
import path from 'node:path';
import type { BuildProfile, ProjectRecord, StartProfile } from './types.js';
import { DEFAULT_BUILD_PROFILE_ID, DEFAULT_PROFILE_ID } from './profiles.js';

/** Python 工具链 */
export type PythonToolchain = 'uv' | 'poetry' | 'pipenv' | 'pip';

/** 与 Node 推断结果对齐的结构 */
export type InferredPythonProfiles = {
  startProfiles: StartProfile[];
  buildProfiles: BuildProfile[];
  defaultProfileId: string;
  defaultBuildProfileId: string;
  startCommand: string;
  installCommand: string;
  toolchain: PythonToolchain;
};

const PYTHON_MARKERS = [
  'pyproject.toml',
  'requirements.txt',
  'requirements-dev.txt',
  'setup.py',
  'setup.cfg',
  'Pipfile',
  'poetry.lock',
  'uv.lock',
] as const;

/**
 * 判断目录是否为 Python 项目。
 *
 * @param root - 项目根
 * @returns 是否含 Python 清单文件
 */
export function isPythonProject(root: string): boolean {
  return PYTHON_MARKERS.some((name) => fs.existsSync(path.join(root, name)));
}

/**
 * 探测 Python 工具链。
 *
 * @param root - 项目根
 * @param pyprojectText - 可选已读入的 pyproject 文本
 * @returns 工具链
 */
export function detectPythonToolchain(
  root: string,
  pyprojectText?: string,
): PythonToolchain {
  if (fs.existsSync(path.join(root, 'uv.lock'))) {
    return 'uv';
  }
  if (fs.existsSync(path.join(root, 'poetry.lock'))) {
    return 'poetry';
  }
  if (fs.existsSync(path.join(root, 'Pipfile'))) {
    return 'pipenv';
  }
  const text =
    pyprojectText ??
    (fs.existsSync(path.join(root, 'pyproject.toml'))
      ? fs.readFileSync(path.join(root, 'pyproject.toml'), 'utf8')
      : '');
  if (/\[tool\.uv[\].]/i.test(text)) {
    return 'uv';
  }
  if (/\[tool\.poetry[\].]/i.test(text)) {
    return 'poetry';
  }
  if (/\[tool\.pdm[\].]/i.test(text)) {
    return 'pip';
  }
  return 'pip';
}

/**
 * 解析 TOML 中形如 [section] key = "value" 的简易键值（仅 scripts 用）。
 *
 * @param text - 全文
 * @param sectionHeaders - 段名列表，如 project.scripts
 * @returns 键值对
 */
function parseTomlStringTable(text: string, sectionHeaders: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of sectionHeaders) {
    const escaped = header.replace(/\./g, '\\.');
    const re = new RegExp(
      `\\[${escaped}\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`,
      'i',
    );
    const block = text.match(re)?.[1];
    if (!block) {
      continue;
    }
    const lineRe = /^\s*([A-Za-z0-9_.-]+)\s*=\s*["']([^"']+)["']/gm;
    let match: RegExpExecArray | null;
    while ((match = lineRe.exec(block)) !== null) {
      result[match[1]!] = match[2]!;
    }
  }
  return result;
}

/**
 * 读取依赖线索文本（requirements + pyproject 片段）。
 *
 * @param root - 项目根
 * @returns 小写合并文本
 */
function readDependencyHints(root: string): string {
  const chunks: string[] = [];
  for (const name of [
    'requirements.txt',
    'requirements-dev.txt',
    'requirements-lock.txt',
    'pyproject.toml',
  ]) {
    const filePath = path.join(root, name);
    if (fs.existsSync(filePath)) {
      try {
        chunks.push(fs.readFileSync(filePath, 'utf8').slice(0, 80_000));
      } catch {
        // ignore
      }
    }
  }
  return chunks.join('\n').toLowerCase();
}

/**
 * 组装工具链下的「运行脚本」命令。
 *
 * @param toolchain - 工具链
 * @param scriptName - 入口名
 * @returns 命令
 */
function runNamedScript(toolchain: PythonToolchain, scriptName: string): string {
  if (toolchain === 'uv') {
    return `uv run ${scriptName}`;
  }
  if (toolchain === 'poetry') {
    return `poetry run ${scriptName}`;
  }
  if (toolchain === 'pipenv') {
    return `pipenv run ${scriptName}`;
  }
  return scriptName;
}

/**
 * 组装 python -m / 文件启动命令。
 *
 * @param toolchain - 工具链
 * @param inner - 实际命令（不含包装）
 * @returns 命令
 */
function wrapPythonCommand(toolchain: PythonToolchain, inner: string): string {
  if (toolchain === 'uv') {
    return `uv run ${inner}`;
  }
  if (toolchain === 'poetry') {
    return `poetry run ${inner}`;
  }
  if (toolchain === 'pipenv') {
    return `pipenv run ${inner}`;
  }
  return inner;
}

/**
 * 推断安装命令。
 *
 * @param root - 项目根
 * @param toolchain - 工具链
 * @returns 安装命令
 */
function inferInstallCommand(root: string, toolchain: PythonToolchain): string {
  if (toolchain === 'uv') {
    return 'uv sync';
  }
  if (toolchain === 'poetry') {
    return 'poetry install';
  }
  if (toolchain === 'pipenv') {
    return 'pipenv install';
  }
  if (fs.existsSync(path.join(root, 'requirements.txt'))) {
    return 'python -m pip install -r requirements.txt';
  }
  if (fs.existsSync(path.join(root, 'requirements-dev.txt'))) {
    return 'python -m pip install -r requirements-dev.txt';
  }
  if (
    fs.existsSync(path.join(root, 'pyproject.toml')) ||
    fs.existsSync(path.join(root, 'setup.py'))
  ) {
    return 'python -m pip install -e .';
  }
  return 'python -m pip install -r requirements.txt';
}

/**
 * 将 id 规范化。
 *
 * @param raw - 原始名
 * @returns profile id
 */
function toProfileId(raw: string): string {
  const id = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return id || DEFAULT_PROFILE_ID;
}

/**
 * 收集 Makefile 中的常见目标。
 *
 * @param root - 项目根
 * @returns 目标名列表
 */
function readMakefileTargets(root: string): string[] {
  const filePath = path.join(root, 'Makefile');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const names = new Set<string>();
    const re = /^([A-Za-z][A-Za-z0-9_-]*):/gm;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const name = match[1]!;
      if (/^(dev|start|run|serve|preview|build|package|dist|install)$/i.test(name)) {
        names.add(name);
      }
    }
    return [...names];
  } catch {
    return [];
  }
}

/**
 * 从目录与清单推断 Python 启动 / 构建模式。
 *
 * @param root - 项目绝对路径
 * @param options.previous - 原登记
 * @param options.openUrl - 默认访问地址
 * @returns 推断结果
 */
export function inferProfilesFromPython(
  root: string,
  options: {
    previous?: ProjectRecord | null;
    openUrl?: string | null;
  } = {},
): InferredPythonProfiles {
  const pyprojectPath = path.join(root, 'pyproject.toml');
  const pyprojectText = fs.existsSync(pyprojectPath)
    ? fs.readFileSync(pyprojectPath, 'utf8')
    : '';
  const toolchain = detectPythonToolchain(root, pyprojectText);
  const installCommand =
    options.previous?.installCommand || inferInstallCommand(root, toolchain);
  const openUrl = options.openUrl ?? options.previous?.openUrl ?? null;
  const deps = readDependencyHints(root);

  const startProfiles: StartProfile[] = [];
  const buildProfiles: BuildProfile[] = [];
  const seenStart = new Set<string>();
  const seenBuild = new Set<string>();

  const pushStart = (profile: StartProfile) => {
    if (seenStart.has(profile.command)) {
      return;
    }
    seenStart.add(profile.command);
    startProfiles.push(profile);
  };

  const pushBuild = (profile: BuildProfile) => {
    if (seenBuild.has(profile.command)) {
      return;
    }
    seenBuild.add(profile.command);
    buildProfiles.push(profile);
  };

  // 1) pyproject / poetry scripts
  const scriptTable = parseTomlStringTable(pyprojectText, [
    'project.scripts',
    'project.gui-scripts',
    'tool.poetry.scripts',
  ]);
  for (const [name, target] of Object.entries(scriptTable)) {
    pushStart({
      id: toProfileId(name),
      name,
      command: runNamedScript(toolchain, name),
      openUrl: null,
      cwd: null,
      phase: null,
      description: `pyproject script → ${target}`,
    });
  }

  // 2) 常见入口文件
  const entryFiles = ['manage.py', 'app.py', 'main.py', 'server.py', 'run.py', 'wsgi.py', 'asgi.py'];
  for (const fileName of entryFiles) {
    if (!fs.existsSync(path.join(root, fileName))) {
      continue;
    }
    if (fileName === 'manage.py') {
      pushStart({
        id: 'django',
        name: 'Django runserver',
        command: wrapPythonCommand(toolchain, 'python manage.py runserver'),
        openUrl: openUrl ?? 'http://127.0.0.1:8000',
        cwd: null,
        phase: null,
        description: '检测到 manage.py',
      });
      continue;
    }
    pushStart({
      id: toProfileId(fileName.replace(/\.py$/i, '')),
      name: `运行 ${fileName}`,
      command: wrapPythonCommand(toolchain, `python ${fileName}`),
      openUrl: null,
      cwd: null,
      phase: null,
      description: `检测到 ${fileName}`,
    });
  }

  // 3) 依赖启发：FastAPI / Flask / Streamlit / Uvicorn
  if (/\bfastapi\b/.test(deps) || /\buvicorn\b/.test(deps)) {
    const moduleCandidates = ['app.main:app', 'main:app', 'app:app', 'server:app'];
    for (const mod of moduleCandidates) {
      const [filePart] = mod.split(':');
      const filePath = path.join(root, `${filePart!.replace(/\./g, '/')}.py`);
      const alt = path.join(root, `${filePart}.py`);
      if (fs.existsSync(filePath) || fs.existsSync(alt) || filePart === 'app' || filePart === 'main') {
        // 仅当对应文件存在，或根下有 app/main 包时添加一次
        const hasFile =
          fs.existsSync(filePath) ||
          fs.existsSync(alt) ||
          fs.existsSync(path.join(root, 'app', 'main.py')) ||
          fs.existsSync(path.join(root, 'app', '__init__.py'));
        if (!hasFile && mod !== 'app:app' && mod !== 'main:app') {
          continue;
        }
        if (
          (mod === 'app.main:app' && !fs.existsSync(path.join(root, 'app', 'main.py'))) ||
          (mod === 'main:app' && !fs.existsSync(path.join(root, 'main.py'))) ||
          (mod === 'app:app' && !fs.existsSync(path.join(root, 'app.py'))) ||
          (mod === 'server:app' && !fs.existsSync(path.join(root, 'server.py')))
        ) {
          continue;
        }
        pushStart({
          id: `uvicorn-${toProfileId(mod)}`,
          name: `Uvicorn ${mod}`,
          command: wrapPythonCommand(toolchain, `uvicorn ${mod} --reload`),
          openUrl: openUrl ?? 'http://127.0.0.1:8000',
          cwd: null,
          phase: null,
          description: '依据 FastAPI/Uvicorn 依赖推断',
        });
      }
    }
  }

  if (/\bflask\b/.test(deps) && fs.existsSync(path.join(root, 'app.py'))) {
    pushStart({
      id: 'flask',
      name: 'Flask',
      command: wrapPythonCommand(toolchain, 'flask --app app run --debug'),
      openUrl: openUrl ?? 'http://127.0.0.1:5000',
      cwd: null,
      phase: null,
      description: '依据 Flask 依赖推断',
    });
  }

  if (/\bstreamlit\b/.test(deps)) {
    for (const fileName of ['app.py', 'streamlit_app.py', 'Home.py', 'main.py']) {
      if (!fs.existsSync(path.join(root, fileName))) {
        continue;
      }
      pushStart({
        id: `streamlit-${toProfileId(fileName)}`,
        name: `Streamlit ${fileName}`,
        command: wrapPythonCommand(toolchain, `streamlit run ${fileName}`),
        openUrl: openUrl ?? 'http://127.0.0.1:8501',
        cwd: null,
        phase: null,
        description: '依据 Streamlit 依赖推断',
      });
    }
  }

  // 4) Makefile 常见目标
  for (const target of readMakefileTargets(root)) {
    const isBuild = /^(build|package|dist)$/i.test(target);
    if (isBuild) {
      pushBuild({
        id: toProfileId(`make-${target}`),
        name: `make ${target}`,
        command: `make ${target}`,
        cwd: null,
        description: 'Makefile 目标',
      });
    } else {
      pushStart({
        id: toProfileId(`make-${target}`),
        name: `make ${target}`,
        command: `make ${target}`,
        openUrl: null,
        cwd: null,
        phase: null,
        description: 'Makefile 目标',
      });
    }
  }

  // 5) 构建：poetry / python -m build / hatch
  if (toolchain === 'poetry' || /\[tool\.poetry[\].]/i.test(pyprojectText)) {
    pushBuild({
      id: DEFAULT_BUILD_PROFILE_ID,
      name: 'Poetry build',
      command: 'poetry build',
      cwd: null,
      description: '打包 wheel/sdist',
    });
  } else if (/\[build-system\]/i.test(pyprojectText)) {
    pushBuild({
      id: DEFAULT_BUILD_PROFILE_ID,
      name: 'python -m build',
      command: wrapPythonCommand(toolchain, 'python -m build'),
      cwd: null,
      description: 'PEP517 构建',
    });
  } else if (/\[tool\.hatch[\].]/i.test(pyprojectText)) {
    pushBuild({
      id: DEFAULT_BUILD_PROFILE_ID,
      name: 'Hatch build',
      command: 'hatch build',
      cwd: null,
      description: 'Hatch 打包',
    });
  }

  // 兜底启动
  if (startProfiles.length === 0) {
    const fallback =
      options.previous?.startCommand &&
      !/npm|pnpm|yarn/i.test(options.previous.startCommand)
        ? options.previous.startCommand
        : wrapPythonCommand(toolchain, 'python main.py');
    pushStart({
      id: DEFAULT_PROFILE_ID,
      name: '默认',
      command: fallback,
      openUrl,
      cwd: null,
      phase: null,
      description: '未识别到明确入口，请按需改命令',
    });
  } else {
    // 默认 id：优先 django/uvicorn/第一个
    const preferred =
      startProfiles.find((item) => item.id === 'django') ??
      startProfiles.find((item) => item.id.startsWith('uvicorn')) ??
      startProfiles.find((item) => item.id === 'flask') ??
      startProfiles[0]!;
    if (preferred.id !== DEFAULT_PROFILE_ID) {
      // 把首选标记为 default：复制为 default 放首位，保留原项也可；简化为改 id
      preferred.id = DEFAULT_PROFILE_ID;
      if (!preferred.openUrl && openUrl) {
        preferred.openUrl = openUrl;
      }
      // 若有重名 default，去掉后面重复
      const rest = startProfiles.filter((item) => item !== preferred);
      startProfiles.length = 0;
      startProfiles.push(preferred, ...rest.filter((item) => item.id !== DEFAULT_PROFILE_ID));
    } else if (!preferred.openUrl && openUrl) {
      preferred.openUrl = openUrl;
    }
  }

  if (buildProfiles.length === 0) {
    pushBuild({
      id: DEFAULT_BUILD_PROFILE_ID,
      name: '默认构建',
      command:
        toolchain === 'poetry'
          ? 'poetry build'
          : wrapPythonCommand(toolchain, 'python -m build'),
      cwd: null,
      description: 'Python 打包（可按项目改命令）',
    });
  }

  // 合并旧 openUrl / cwd
  const prevStarts = new Map(
    (options.previous?.startProfiles ?? []).map((item) => [item.id, item]),
  );
  for (const item of startProfiles) {
    const old = prevStarts.get(item.id);
    if (!old) {
      continue;
    }
    item.openUrl = old.openUrl ?? item.openUrl ?? null;
    item.cwd = old.cwd ?? item.cwd ?? null;
    item.phase = old.phase ?? item.phase ?? null;
    item.description = old.description || item.description || '';
  }

  const defaultProfileId =
    startProfiles.find((item) => item.id === DEFAULT_PROFILE_ID)?.id ??
    startProfiles[0]!.id;
  const defaultBuildProfileId =
    buildProfiles.find((item) => item.id === DEFAULT_BUILD_PROFILE_ID)?.id ??
    buildProfiles[0]!.id;

  return {
    startProfiles,
    buildProfiles,
    defaultProfileId,
    defaultBuildProfileId,
    startCommand:
      startProfiles.find((item) => item.id === defaultProfileId)?.command ??
      startProfiles[0]!.command,
    installCommand,
    toolchain,
  };
}
