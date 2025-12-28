import type { client } from './plugins/trpcClient.js'

declare module '#app' {
  interface NuxtApp {
    $client: client
  }
}
