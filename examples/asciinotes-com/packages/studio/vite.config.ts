import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    peerDepsExternal(),
    dts({
      entryRoot: 'src',
      insertTypesEntry: true,
    }),
  ],
  build: {
    rollupOptions: {
      external: [/^lit/, /^@prisma\/client/],
    },
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
    },
  },
});
