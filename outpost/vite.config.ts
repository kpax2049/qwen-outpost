import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The showcase.html entry is a developer-only Visual Showcase / Asset Atlas.
// It is a separate entry point (never linked from the main game) and is
// isolated from normal production gameplay.
//
// For GitHub Pages deployment, set PAGES_BASE=/qwen-outpost/ before build.
// For localhost dev (default), no base prefix is needed.
export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        showcase: 'showcase.html',
      },
    },
  },
})
