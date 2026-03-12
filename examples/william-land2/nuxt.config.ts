import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

const pkgs = fileURLToPath(new URL('../../packages', import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/image', '@nuxt/test-utils'],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  ssr: true,
  nitro: {
    preset: 'static',
  },

  alias: {
    '@woven-canvas/vue/style.css': `${pkgs}/vue/src/theme.css`,
    '@woven-canvas/vue': `${pkgs}/vue/src/index.ts`,
    '@woven-canvas/core': `${pkgs}/core/src/index.ts`,
    '@woven-canvas/math': `${pkgs}/math/src/index.ts`,
    '@woven-canvas/asset-sync': `${pkgs}/asset-sync/src/index.ts`,
    '@woven-canvas/plugin-canvas-controls': `${pkgs}/plugin-canvas-controls/src/index.ts`,
    '@woven-canvas/plugin-selection': `${pkgs}/plugin-selection/src/index.ts`,
    '@woven-canvas/plugin-eraser': `${pkgs}/plugin-eraser/src/index.ts`,
    '@woven-canvas/plugin-pen': `${pkgs}/plugin-pen/src/index.ts`,
    '@woven-canvas/plugin-arrows': `${pkgs}/plugin-arrows/src/index.ts`,
  },

  compatibilityDate: '2025-01-15',
})
