import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

/** LabHub 控制台开发端口（勿与常见 Vite 517x 托管项目共用；可用 LABHUB_CLIENT_DEV_PORT 覆盖） */
const clientDevPort = Number(process.env.LABHUB_CLIENT_DEV_PORT) || 8777;

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // 固定 IPv4，避免 Windows 下仅 [::1]:8777 监听而 127.0.0.1 拒绝连接
    host: process.env.LABHUB_CLIENT_DEV_HOST || '127.0.0.1',
    port: clientDevPort,
    strictPort: true,
    open: `http://127.0.0.1:${clientDevPort}/`,
    proxy: {
      '/api': 'http://127.0.0.1:8790',
    },
  },
});
