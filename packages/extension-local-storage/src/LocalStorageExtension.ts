import { BaseExtension, type BaseResources } from '@infinitecanvas/core'
import { Block } from '@infinitecanvas/core/components'
import { Persistent } from '@infinitecanvas/core/components'
import type { System } from '@lastolivegames/becsy'

import { LocalDB } from './LocalDB'
import * as sys from './systems'
import { LocalStorageOptions, type LocalStorageResources } from './types'

class LocalStorageExtensionClass extends BaseExtension {
  private initialEntities: Record<string, Record<string, any>> = {}

  constructor(public options: LocalStorageOptions = {}) {
    super()
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    const options = LocalStorageOptions.parse(this.options)

    const localDB = await LocalDB.New(options.persistenceKey)
    this.initialEntities = await localDB.getAll()

    const localStorageResources: LocalStorageResources = {
      ...resources,
      localDB,
    }

    this._preInputGroup = this.createGroup(localStorageResources, sys.PreInputLocalDB)
  }

  public build(worldSystem: System, resources: BaseResources): void {
    // const componentNames = new Map(ComponentRegistry.instance.components.map((c) => [c.name, c]))

    for (const [id, entity] of Object.entries(this.initialEntities)) {
      const args = []

      const tag = entity.Block.tag
      const components = resources.blockDefs[tag]?.components

      if (!components) {
        console.warn(`Local storage tried to load a block with tag "${tag}" but no blockDefs were found for it.`)
        continue
      }

      for (const component of [Block, ...components]) {
        const model = entity[component.name] || {}
        args.push(component, model)
      }

      worldSystem.createEntity(...args, Persistent)
    }

    // clear initialEntities to save on memory
    this.initialEntities = {}
  }
}

export const LocalStorageExtension = (options: LocalStorageOptions = {}) => new LocalStorageExtensionClass(options)
