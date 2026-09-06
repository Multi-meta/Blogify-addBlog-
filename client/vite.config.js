import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendURL = env.VITE_API_URL || 'http://localhost:8000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/user':    { target: backendURL, changeOrigin: true },
        '/blog':    { target: backendURL, changeOrigin: true },
        '/api':     { target: backendURL, changeOrigin: true },
        '/uploads': { target: backendURL, changeOrigin: true },
        '/images':  { target: backendURL, changeOrigin: true },
        '/admin':   { target: backendURL, changeOrigin: true },
      },
    },
  };
});
