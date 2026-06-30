import { defineConfig } from 'vite'
import path from 'path'
import { injectWindowGlobals } from './vite-plugin-window-globals.js'

export default defineConfig({
  plugins: [injectWindowGlobals()],
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
