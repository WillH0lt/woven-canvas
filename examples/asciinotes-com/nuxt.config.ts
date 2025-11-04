import fullReload from 'vite-plugin-full-reload'
import glsl from 'vite-plugin-glsl'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  build: {
    transpile: ['trpc-nuxt'],
  },
  runtimeConfig: {
    previewsBucket: 'scrolly-page-previews',
    stripeSecretKey:
      process.env.STRIPE_SECRET_KEY ??
      'sk_test_51QkUTaDOgjoaDKnixYbAsQUOEZKgM7shyD8t6NBzbZuTxYEq4EwT1RlNuiDbYPkAZd9ETo8QNVYDt8vf1m88rFL00052RyekxW',
  },
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1.0, interactive-widget=resizes-content',
    },
  },
  modules: [
    'nuxt-vuefire',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    [
      '@pinia/nuxt',
      {
        autoImports: ['defineStore', 'acceptHMRUpdate'],
      },
    ],
    'nuxt-svgo',
    'nuxt-gtag',
  ],
  css: ['~/assets/css/main.css'],
  tailwindcss: {
    configPath: '~/tailwind.config.js',
  },
  imports: {
    dirs: ['./stores'],
  },
  nitro: {
    prerender: {
      // these routes are not dependent on any data and can be prerendered
      // it's a good idea to pre render all routes that you can
      routes: [],
    },
    experimental: {
      tasks: true,
    },
  },
  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => tag.startsWith('sl-'),
    },
  },
  vuefire: {
    emulators: {
      enabled: true,
    },
    auth: {
      enabled: true,
      sessionCookie: true,
      options: {
        disableWarnings: true,
      },
      host: '0.0.0.0',
    },

    firestore: { host: '0.0.0.0', port: 8081 },
    storage: { host: '0.0.0.0', port: 9199 },

    config: {
      apiKey: 'AIzaSyAAEJv-pRGSCelgyNkRoPKyQkW4j_HWhx4',
      authDomain: 'scrolly-page.firebaseapp.com',
      projectId: 'scrolly-page',
      storageBucket: 'scrolly-page.firebasestorage.app',
      messagingSenderId: '208116818022',
      appId: '1:208116818022:web:b73a62d598b359d71ccda7',
      measurementId: 'G-DGMDYTR1X3',
    },
  },
  svgo: {
    defaultImport: 'component',
    svgoConfig: {
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              inlineStyles: {
                removeMatchedSelectors: false,
              },
              minifyStyles: false,
            },
          },
        },
      ],
    },
  },

  vite: {
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          verbatimModuleSyntax: false,
          useDefineForClassFields: false,
        },
      },
    },
    plugins: [glsl(), fullReload(['packages/**/*'])],
  },
  alias: {
    '.prisma/client': './node_modules/.prisma/client',
  },
})
