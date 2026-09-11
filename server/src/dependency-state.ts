import fs from 'node:fs';
import path from 'node:path';

/** 依赖安装检测结果 */
export type DependencyState = {
  /** 是否已安装（可启动 / 构建） */
  depsInstalled: boolean;
  /** 是否需要先安装（有清单但未装） */
  needsInstall: boolean;
};

/**
 * 检测项目根目录依赖是否已安装。
 * Node：存在 package.json 时看 node_modules；
 * Python：存在 requirements / pyproject 时看 .venv / venv。
 *
 * @param projectRoot - 项目绝对路径
 * @returns 依赖状态
 */
export function detectDependencyState(projectRoot: string): DependencyState {
  if (!fs.existsSync(projectRoot)) {
    return { depsInstalled: false, needsInstall: false };
  }

  const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
  const hasPythonManifest =
    fs.existsSync(path.join(projectRoot, 'requirements.txt')) ||
    fs.existsSync(path.join(projectRoot, 'pyproject.toml')) ||
    fs.existsSync(path.join(projectRoot, 'Pipfile'));

  if (hasPackageJson) {
    const installed = fs.existsSync(path.join(projectRoot, 'node_modules'));
    return { depsInstalled: installed, needsInstall: !installed };
  }

  if (hasPythonManifest) {
    const installed =
      fs.existsSync(path.join(projectRoot, '.venv')) ||
      fs.existsSync(path.join(projectRoot, 'venv'));
    return { depsInstalled: installed, needsInstall: !installed };
  }

  return { depsInstalled: true, needsInstall: false };
}
