import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages repository deployments are commonly served from
  // https://USERNAME.github.io/REPO_NAME/. Keep the relative base below so the
  // built app works from a subfolder without hard-coding an unknown repo name.
  // If your course/deployment workflow requires an absolute Vite base instead,
  // change this to "/REPO_NAME/" before publishing.
  base: './',
  plugins: [
    {
      name: 'cryorover-vite8-dev-client-flags',
      enforce: 'pre',
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            children:
              'var __BUNDLED_DEV__ = false; var __SERVER_FORWARD_CONSOLE__ = false;',
            injectTo: 'head-prepend'
          }
        ];
      }
    }
  ]
});
