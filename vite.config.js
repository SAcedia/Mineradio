import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  // plugins removed (using codemod instead)
  // Root = public/ where index.html lives
  root: 'public',

  // Base path for assets in production build
  base: '/',

  // Development server
  server: {
    port: 5173,
    // Proxy API calls to the Mineradio backend on port 3000
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // Production build
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
    },
  },

  // Path aliases
  resolve: {
    alias: {
      '@js': path.resolve(__dirname, 'public/js'),
      '@vendor': path.resolve(__dirname, 'public/vendor'),
    },
  },

  // CSS sourcemaps in dev
  css: {
    devSourcemap: true,
  },
})
