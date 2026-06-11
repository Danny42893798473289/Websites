import { defineConfig } from 'vite';

export default defineConfig({
  // Only bake in VITE_SIGNALING_URL when set (e.g. wss://your-domain).
  // Otherwise main.ts uses ws(s)://location.host so LAN/mobile URLs work.
  server: {
    port: 5500,
    proxy: {
      '/ws': {
        target: 'http://localhost:5500',
        ws: true,
      },
    },
  },
  preview: {
    port: 5500,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
