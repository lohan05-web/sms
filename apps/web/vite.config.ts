import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const prismaStub = fileURLToPath(new URL('./src/stubs/prisma-client.ts', import.meta.url));

const proxy = {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  },
  // Socket.IO needs an explicit WebSocket-aware proxy entry so realtime
  // notifications keep working when the web app is served by Vite.
  '/socket.io': {
    target: 'http://localhost:4000',
    changeOrigin: true,
    ws: true,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@prisma/client': prismaStub,
    },
  },
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
});
