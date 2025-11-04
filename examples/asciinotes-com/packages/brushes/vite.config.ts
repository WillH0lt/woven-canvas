import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [
    glsl(),
    dts({
      entryRoot: 'src/brushes',
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: 'src/brushes/index.ts',
      formats: ['es'],
    },
    rollupOptions: {
      plugins: [peerDepsExternal()],
    },
  },
});
