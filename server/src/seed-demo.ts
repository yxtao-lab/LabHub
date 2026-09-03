/**
 * 将 freellmapi / edgetunnel 登记进 labhub（优先使用 projects/ 下已有克隆，否则浅克隆）。
 * 用法：在 labhub 根目录 npm run seed:demo
 */
import fs from 'node:fs';
import path from 'node:path';
import { addProject } from './projects-service.js';
import { ensureDirs, findProject, PROJECTS_DIR, ROOT_DIR } from './store.js';

/**
 * 登记演示项目到 projects/ 托管目录。
 *
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  ensureDirs();

  if (!findProject('freellmapi')) {
    const freeCandidates = [
      path.join(PROJECTS_DIR, 'freellmapi'),
      path.resolve(ROOT_DIR, '../freellmapi'),
    ];
    const freePath = freeCandidates.find((item) => fs.existsSync(item));
    if (freePath && freePath.startsWith(path.normalize(PROJECTS_DIR + path.sep))) {
      await addProject({
        repoUrl: 'https://github.com/tashfeenahmed/freellmapi.git',
        id: 'freellmapi',
        name: 'FreeLLMAPI',
        branch: 'main',
        startCommand: 'npm run dev',
        installCommand: 'npm install',
        openUrl: 'http://127.0.0.1:5173',
        tags: ['LLM', '网关', '自托管'],
        upstreamUrl: null,
        notes: '挂载 projects/freellmapi',
        localPath: freePath,
        shallow: true,
        skipInstall: true,
      });
      console.log('[seed] 已登记 freellmapi ->', freePath);
    } else if (freePath) {
      // 同级目录仅作来源参考：正式托管仍克隆进 projects/
      await addProject({
        repoUrl: 'https://github.com/tashfeenahmed/freellmapi.git',
        id: 'freellmapi',
        name: 'FreeLLMAPI',
        branch: 'main',
        startCommand: 'npm run dev',
        installCommand: 'npm install',
        openUrl: 'http://127.0.0.1:5173',
        tags: ['LLM', '网关', '自托管'],
        upstreamUrl: null,
        notes: '托管于 projects/freellmapi',
        shallow: true,
        skipInstall: false,
      });
      const envSrc = path.join(freePath, '.env');
      const envDst = path.join(PROJECTS_DIR, 'freellmapi', '.env');
      if (fs.existsSync(envSrc) && !fs.existsSync(envDst)) {
        fs.copyFileSync(envSrc, envDst);
        console.log('[seed] 已从同级 freellmapi 复制 .env');
      }
      console.log('[seed] 已克隆并登记 freellmapi');
    } else {
      await addProject({
        repoUrl: 'https://github.com/tashfeenahmed/freellmapi.git',
        id: 'freellmapi',
        name: 'FreeLLMAPI',
        branch: 'main',
        startCommand: 'npm run dev',
        installCommand: 'npm install',
        openUrl: 'http://127.0.0.1:5173',
        tags: ['LLM', '网关', '自托管'],
        upstreamUrl: null,
        notes: '托管于 projects/freellmapi',
        shallow: true,
        skipInstall: false,
      });
      console.log('[seed] 已克隆并登记 freellmapi');
    }
  } else {
    console.log('[seed] freellmapi 已存在，跳过');
  }

  if (!findProject('edgetunnel')) {
    const edgeCandidates = [
      path.join(PROJECTS_DIR, 'edgetunnel'),
      path.resolve(ROOT_DIR, '../freellmapi/projects/edgetunnel'),
    ];
    const edgePath = edgeCandidates.find((item) => fs.existsSync(item));
    if (edgePath) {
      await addProject({
        repoUrl: 'https://github.com/yxtao-lab/edgetunnel.git',
        id: 'edgetunnel',
        name: 'EdgeTunnel',
        branch: 'main',
        startCommand: 'npx wrangler dev src/worker-vless.js --port 8788',
        installCommand: 'npm install',
        openUrl: 'http://127.0.0.1:8788',
        tags: ['边缘', 'Workers', '隧道'],
        upstreamUrl: null,
        notes: '挂载已有克隆；wrangler :8788',
        localPath: edgePath,
        shallow: true,
        skipInstall: true,
      });
      console.log('[seed] 已登记 edgetunnel ->', edgePath);
    } else {
      await addProject({
        repoUrl: 'https://github.com/yxtao-lab/edgetunnel.git',
        id: 'edgetunnel',
        name: 'EdgeTunnel',
        branch: 'main',
        startCommand: 'npx wrangler dev src/worker-vless.js --port 8788',
        installCommand: 'npm install',
        openUrl: 'http://127.0.0.1:8788',
        tags: ['边缘', 'Workers', '隧道'],
        upstreamUrl: null,
        notes: 'wrangler :8788，避开 LabHub :8790',
        shallow: true,
        skipInstall: false,
      });
      console.log('[seed] 已克隆并登记 edgetunnel');
    }
  } else {
    console.log('[seed] edgetunnel 已存在，跳过');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
