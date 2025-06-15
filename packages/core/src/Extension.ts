import type { SystemGroup } from '@lastolivegames/becsy'

import type { CommandArgs, ICommands, Resources, SendCommandFn } from './types.js'

export abstract class Extension {
  public name = 'base'

  protected _commands: Record<string, (...args: any[]) => () => void> = {}
  public get commands(): Record<string, (...args: any[]) => () => void> {
    return this._commands
  }

  // protected _store: StoreApi<any> | null = null
  // public get store(): StoreApi<any> | null {
  //   return this._store
  // }

  protected _inputGroup: SystemGroup | null = null
  public get inputGroup(): SystemGroup | null {
    return this._inputGroup
  }

  protected _captureGroup: SystemGroup | null = null
  public get captureGroup(): SystemGroup | null {
    return this._captureGroup
  }

  protected _updateGroup: SystemGroup | null = null
  public get updateGroup(): SystemGroup | null {
    return this._updateGroup
  }

  protected _renderGroup: SystemGroup | null = null
  public get renderGroup(): SystemGroup | null {
    return this._renderGroup
  }

  public abstract initialize(resources: Resources): Promise<void>

  // protected createStore<T>(initialState: T): StoreApi<T> {
  //   this._store = createStore<T>(() => ({
  //     ...initialState,
  //   }))

  //   return this._store
  // }

  public addCommands(_send: SendCommandFn<CommandArgs>): Partial<ICommands> {
    return {}
  }
}
