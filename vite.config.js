import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  define: {
    __BUILD__: JSON.stringify(new Date().toLocaleString('zh-CN', { hour12: false }))
  },
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist' }
});
