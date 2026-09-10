import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5177,
    open: 'http://127.0.0.1:5177/',
    proxy: {
      '/api': 'http://127.0.0.1:8790',
    },
  },
});
