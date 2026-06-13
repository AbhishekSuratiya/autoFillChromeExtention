import { defineConfig } from 'vite'
import { resolve } from 'path'

// Separate build for the content script.
// Must be IIFE format — Chrome content scripts cannot use ES modules.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/content.ts'),
      name: 'JobFillContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't wipe dist — main build already ran
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
