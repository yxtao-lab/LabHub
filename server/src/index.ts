import { createApp } from './app.js';
import { ensureMissingAnalyses } from './analysis-generate.js';
import { getCloudUrl } from './auth-store.js';
import { getDeepSeekConfig } from './analysis-deepseek.js';
import { loadRootEnvFile } from './load-env.js';
import { ensureComprehensiveProfiles } from './projects-service.js';
import { clearAllRuntimes } from './runtime-store.js';
import { ensureDirs, loadProjects } from './store.js';
import { syncCursorWorkspaceFile } from './workspace-sync.js';

loadRootEnvFile();
ensureDirs();

const cloudUrl = getCloudUrl();
const deepseek = getDeepSeekConfig();
if (cloudUrl) {
  console.log(`[labhub] Cloud：${cloudUrl}（手机号登录 / 清单同步 / AI 配额）`);
} else if (deepseek.apiKey) {
  console.log('[labhub] 未配置 Cloud；本机 DEEPSEEK_API_KEY 仅作维护者调试');
} else {
  console.log('[labhub] 未配置 Cloud；首次托管将使用本地启发式分析');
}

clearAllRuntimes();
console.log('[labhub] 托管项目默认不自动启动，请在控制台按需启停');

try {
  syncCursorWorkspaceFile();
} catch (error) {
  console.warn('[labhub] 同步 Cursor 工作区文件失败', error);
}
try {
  const generatedIds = ensureMissingAnalyses(loadProjects());
  if (generatedIds.length > 0) {
    console.log(`[labhub] 已用启发式补全缺失分析：${generatedIds.join(', ')}`);
  }
} catch (error) {
  console.warn('[labhub] 自动生成分析总结失败', error);
}

void ensureComprehensiveProfiles().catch((error) => {
  console.warn('[labhub] 补全启动/构建模式失败', error);
});

const port = Number(process.env.PORT ?? 8790);
const app = createApp();

app.listen(port, () => {
  console.log(`[labhub] 管理端 API http://127.0.0.1:${port}`);
  console.log(`[labhub] 开发时控制台请另开 Vite（默认 :5177）`);
});
