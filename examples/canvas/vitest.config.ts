import { mergeConfig } from 'vitest/config'
import testConfig from '../../vitest.config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, testConfig)
