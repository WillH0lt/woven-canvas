import { System, type SystemGroup } from '@lastolivegames/becsy'

import type { State } from './State'
import type { BaseResources, BlockDefInput, CommandArgs, ICommands, IStore, SendCommandFn, ToolDefInput } from './types'

export class BaseExtension {
  public readonly blocks: BlockDefInput[] = []

  public readonly tools: ToolDefInput[] = []

  public readonly dependsOn = Array<string>()

  // public static toolbarButtons: ToolbarButtonInput[] = []

  // == Input Groups ==
  public preInputGroup: SystemGroup | null = null
  public inputGroup: SystemGroup | null = null
  public postInputGroup: SystemGroup | null = null

  // == Capture Groups ==
  public preCaptureGroup: SystemGroup | null = null
  public captureGroup: SystemGroup | null = null
  public postCaptureGroup: SystemGroup | null = null

  // == Update Groups ==
  public preUpdateGroup: SystemGroup | null = null
  public updateGroup: SystemGroup | null = null
  public postUpdateGroup: SystemGroup | null = null

  // == Render Groups ==
  public preRenderGroup: SystemGroup | null = null
  public renderGroup: SystemGroup | null = null
  public postRenderGroup: SystemGroup | null = null

  public checkDependencies(dependencies: BaseExtension[]): void {
    for (const dep of this.dependsOn) {
      if (!dependencies.some((d) => d.constructor.name.startsWith(dep))) {
        console.warn(`Missing dependency for ${this.constructor.name}: ${dep}`)
      }
    }
  }

  protected createGroup(resources: BaseResources, ...systems: (new () => System)[]): SystemGroup {
    const systemArray = []
    for (const system of systems) {
      systemArray.push(system)
      systemArray.push({ resources })
    }

    // @ts-ignore
    return System.group(...systemArray)
  }

  public preBuild(_resources: BaseResources): Promise<void> {
    // implementation in subclasses
    return Promise.resolve()
  }

  public build(_worldSystem: System, _resources: BaseResources): void {
    // implementation in subclasses
  }

  public addCommands(_send: SendCommandFn<CommandArgs>): Partial<ICommands> {
    return {}
  }

  public addStore(_state: State): Partial<IStore> {
    return {}
  }

  public async destroy(): Promise<void> {
    // implementation in subclasses
    return Promise.resolve()
  }
}
