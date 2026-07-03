import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/sanger-viewer/',
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        blog: fileURLToPath(new URL('./blog/index.html', import.meta.url)),
        blogEntry: fileURLToPath(new URL('./blog/2026-07-03-v0-foundation/index.html', import.meta.url))
      }
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node'
  }
}))
