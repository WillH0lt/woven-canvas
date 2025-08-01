import { BaseExtension, type BaseResources, ComponentRegistry } from '@infinitecanvas/core'
import { Persistent } from '@infinitecanvas/core/components'
import { System } from '@lastolivegames/becsy'

import { LocalDB } from './LocalDB'
import * as sys from './systems'
import { LocalStorageOptions, type LocalStorageResources } from './types'

export class LocalStorageExtension extends BaseExtension {
  public name = 'local-storage'

  private initialEntities: Record<string, Record<string, any>> = {}

  constructor(private readonly options: LocalStorageOptions = {}) {
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

    this._preInputGroup = System.group(sys.PreInputLocalDB, { resources: localStorageResources })
  }

  public build(worldSystem: System): void {
    const componentNames = new Map(ComponentRegistry.instance.components.map((c) => [c.name, c]))

    for (const [id, entity] of Object.entries(this.initialEntities)) {
      const args = []
      for (const [componentName, model] of Object.entries(entity)) {
        const Component = componentNames.get(componentName)
        if (!Component) continue
        args.push(Component, model)
      }

      // @ts-ignore
      worldSystem.createEntity(...args, Persistent, { id })
    }

    // clear initialEntities to save on memory
    this.initialEntities = {}
  }
}
