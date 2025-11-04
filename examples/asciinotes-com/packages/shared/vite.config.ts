import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      insertTypesEntry: true,
    }),
  ],
  build: {
    // rollupOptions: {
    //   external: '.prisma/client/index.js',
    // },
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
    },
  },
  // resolve: {
  //   alias: {
  //     '.prisma/client/index-browser': './node_modules/.prisma/client/index-browser.js',
  //   },
  // },
});
