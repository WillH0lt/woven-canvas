import { mergeConfig } from 'vitest/config'
import testConfig from '../../vitest.config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, testConfig)
