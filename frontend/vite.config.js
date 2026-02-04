import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  server: {
    port: 8080,
    open: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './public/index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});