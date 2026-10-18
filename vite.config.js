import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project sites are served from /<repo>/, so every built
  // asset and texture URL must stay relative to index.html.
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5199,
  },
  build: {
    target: 'esnext',
    minify: false,
    sourcemap: false,
  },
});
