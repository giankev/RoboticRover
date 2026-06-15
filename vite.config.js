import { defineConfig } from 'vite';

export default defineConfig({
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
