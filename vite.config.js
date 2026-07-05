import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 建置設定:React + 開發伺服器
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
