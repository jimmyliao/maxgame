import { defineConfig } from 'vite';

// GitHub Pages 子路徑部署：https://jimmyliao.github.io/maxgame/
export default defineConfig({
  base: '/maxgame/',
  build: { outDir: 'dist', emptyOutDir: true },
});
