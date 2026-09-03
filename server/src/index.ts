import { createApp } from './app.js';
import { ensureDirs } from './store.js';

ensureDirs();

const port = Number(process.env.PORT ?? 8790);
const app = createApp();

app.listen(port, () => {
  console.log(`[labhub] 管理端 API http://127.0.0.1:${port}`);
  console.log(`[labhub] 开发时控制台请另开 Vite（默认 :5177）`);
});
