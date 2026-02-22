import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'node:path';

const analyze = process.env.ANALYZE === 'true';

export default defineConfig(async () => {
  let visualizerPlugin = null;

  if (analyze) {
    try {
      const mod = await import('rollup-plugin-visualizer');
      visualizerPlugin = mod.visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      });
    } catch {
      console.warn(
        '[vite] rollup-plugin-visualizer not installed. Run npm install to enable analyze.',
      );
      visualizerPlugin = null;
    }
  }

  return {
    plugins: [TanStackRouterVite(), react(), visualizerPlugin].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
