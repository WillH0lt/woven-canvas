import { System, type SystemGroup } from '@lastolivegames/becsy'

import type { State } from './State'
import type { BaseResources, BlockDefInput, CommandArgs, ICommands, IStore, SendCommandFn, ToolDefInput } from './types'

export class BaseExtension {
  public readonly blocks: BlockDefInput[] = []

  public readonly tools: ToolDefInput[] = []

  public readonly dependsOn = Array<string>()

  // public static toolbarButtons: ToolbarButtonInput[] = []

  // == Input Groups ==
  protected preInputGroup: SystemGroup | null = null
  protected inputGroup: SystemGroup | null = null
  protected postInputGroup: SystemGroup | null = null

  // == Capture Groups ==
  protected preCaptureGroup: SystemGroup | null = null
  protected captureGroup: SystemGroup | null = null
  protected postCaptureGroup: SystemGroup | null = null

  // == Update Groups ==
  protected preUpdateGroup: SystemGroup | null = null
  protected updateGroup: SystemGroup | null = null
  protected postUpdateGroup: SystemGroup | null = null

  // == Render Groups ==
  protected preRenderGroup: SystemGroup | null = null
  protected renderGroup: SystemGroup | null = null
  protected postRenderGroup: SystemGroup | null = null

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
