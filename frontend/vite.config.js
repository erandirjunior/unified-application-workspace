import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || '3000'),
      host: true,
      strictPort: true,
      watch: { usePolling: true }
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:8080'),
      'import.meta.env.VITE_TZ': JSON.stringify(env.TZ || ''),
    }
  };
});
