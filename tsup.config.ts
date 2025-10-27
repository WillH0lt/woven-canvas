import { replace } from 'esbuild-plugin-replace'
import { defineConfig } from 'tsup'

export default defineConfig({
  sourcemap: true,
  experimentalDts: true,
  minify: false,
  format: ['esm', 'cjs'],
  outDir: 'build',
  // esbuildPlugins: [
  //   replace({
  //     '@lastolivegames/becsy': '@lastolivegames/becsy/perf',
  //   }),
  // ],
})
