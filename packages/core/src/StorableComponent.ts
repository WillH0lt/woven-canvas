// import type { ComponentType } from '@lastolivegames/becsy'
// import { store } from './Store.js'

// export interface StorableOptions {
//   exclude?: string[]
// }

// export function storable<T extends ComponentType<any>>(options?: StorableOptions) {
//   return <U extends T>(Base: U): U => {
//     return class extends (Base as { new (...args: any[]): any }) {
//       toJson() {
//         if ((Base as any).schema === undefined) {
//           console.warn('StorableComponent: No schema defined for', this.constructor.name)
//           return {}
//         }

//         const data: Record<string, any> = {}

//         for (const key of Object.keys((Base as any).schema)) {
//           if (options?.exclude?.includes(key)) continue
//           data[key] = this[key]
//         }

//         return data
//       }
//     } as unknown as U
//   }
// }
