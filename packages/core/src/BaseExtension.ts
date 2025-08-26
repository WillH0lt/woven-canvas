import { System, type SystemGroup } from '@lastolivegames/becsy'

import type { State } from './State'
import type { BaseResources, BlockDefInput, CommandArgs, ICommands, IStore, SendCommandFn, ToolDefInput } from './types'

export class BaseExtension {
  public readonly blocks: BlockDefInput[] = []

  public readonly tools: ToolDefInput[] = []

  public readonly dependsOn = Array<string>()

  // public static toolbarButtons: ToolbarButtonInput[] = []

  // == Input Groups ==
  protected _preInputGroup: SystemGroup | null = null
  public get preInputGroup(): SystemGroup | null {
    return this._preInputGroup
  }

  protected _inputGroup: SystemGroup | null = null
  public get inputGroup(): SystemGroup | null {
    return this._inputGroup
  }

  protected _postInputGroup: SystemGroup | null = null
  public get postInputGroup(): SystemGroup | null {
    return this._postInputGroup
  }

  // == Capture Groups ==
  protected _preCaptureGroup: SystemGroup | null = null
  public get preCaptureGroup(): SystemGroup | null {
    return this._preCaptureGroup
  }

  protected _captureGroup: SystemGroup | null = null
  public get captureGroup(): SystemGroup | null {
    return this._captureGroup
  }

  protected _postCaptureGroup: SystemGroup | null = null
  public get postCaptureGroup(): SystemGroup | null {
    return this._postCaptureGroup
  }

  // == Update Groups ==
  protected _preUpdateGroup: SystemGroup | null = null
  public get preUpdateGroup(): SystemGroup | null {
    return this._preUpdateGroup
  }

  protected _updateGroup: SystemGroup | null = null
  public get updateGroup(): SystemGroup | null {
    return this._updateGroup
  }

  protected _postUpdateGroup: SystemGroup | null = null
  public get postUpdateGroup(): SystemGroup | null {
    return this._postUpdateGroup
  }

  // == Render Groups ==
  protected _preRenderGroup: SystemGroup | null = null
  public get preRenderGroup(): SystemGroup | null {
    return this._preRenderGroup
  }

  protected _renderGroup: SystemGroup | null = null
  public get renderGroup(): SystemGroup | null {
    return this._renderGroup
  }

  protected _postRenderGroup: SystemGroup | null = null
  public get postRenderGroup(): SystemGroup | null {
    return this._postRenderGroup
  }

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
