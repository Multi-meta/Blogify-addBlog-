import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendURL = env.VITE_API_URL || 'http://localhost:8000';

  const htmlBypass = (req, res, options) => {
    // If the browser is requesting an HTML document (like on a page refresh),
    // do NOT proxy the request to the backend API.
    // Instead, fall back to index.html so React Router can handle it.
    if (req.headers.accept?.includes('text/html')) {
      return '/index.html';
    }
  };

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/user':    { target: backendURL, changeOrigin: true, bypass: htmlBypass },
        '/blog':    { target: backendURL, changeOrigin: true, bypass: htmlBypass },
        '/api':     { target: backendURL, changeOrigin: true, bypass: htmlBypass },
        '/uploads': { target: backendURL, changeOrigin: true },
        '/images':  { target: backendURL, changeOrigin: true },
        '/admin':   { target: backendURL, changeOrigin: true, bypass: htmlBypass },
      },
    },
  };
});
