import { createApp } from './app.js';
import { ensureMissingAnalyses } from './analysis-generate.js';
import { clearAllRuntimes } from './runtime-store.js';
import { ensureDirs, loadProjects } from './store.js';

ensureDirs();

// LabHub 启动时不自动拉起托管项目；清掉上次会话的运行态认领，避免误显示「运行中」
clearAllRuntimes();
console.log('[labhub] 托管项目默认不自动启动，请在控制台按需启停');

try {
  const generatedIds = ensureMissingAnalyses(loadProjects());
  if (generatedIds.length > 0) {
    console.log(`[labhub] 已自动生成分析总结：${generatedIds.join(', ')}`);
  }
} catch (error) {
  console.warn('[labhub] 自动生成分析总结失败', error);
}

const port = Number(process.env.PORT ?? 8790);
const app = createApp();

app.listen(port, () => {
  console.log(`[labhub] 管理端 API http://127.0.0.1:${port}`);
  console.log(`[labhub] 开发时控制台请另开 Vite（默认 :5177）`);
});
