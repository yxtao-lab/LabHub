import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from './app-paths.js';

/**
 * 从 LabHub 根目录加载 .env 到 process.env（不覆盖已有环境变量）。
 * 仅支持 KEY=VALUE 与可选引号；忽略空行与 # 注释。不解析多行值。
 *
 * @returns 新写入的变量名列表
 */
export function loadRootEnvFile(): string[] {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) {
    return [];
  }
  const text = fs.readFileSync(envPath, 'utf8');
  const loaded: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    if (process.env[key] !== undefined) {
      continue;
    }
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
    loaded.push(key);
  }
  return loaded;
}
