import type { ISerializable } from './types.js'

export class ComponentRegistry {
  private static _instance: ComponentRegistry | null = null

  static get instance(): ComponentRegistry {
    if (!ComponentRegistry._instance) {
      ComponentRegistry._instance = new ComponentRegistry()
    }
    return ComponentRegistry._instance
  }

  private readonly _historyComponents: (new () => ISerializable)[] = []
  private readonly _stateComponents: (new () => ISerializable)[] = []

  private constructor() {}

  public get historyComponents(): (new () => ISerializable)[] {
    return this._historyComponents
  }

  public get stateComponents(): (new () => ISerializable)[] {
    return this._stateComponents
  }

  public registerStateComponent(serializable: new () => ISerializable): void {
    if (!this._stateComponents.includes(serializable)) {
      this._stateComponents.push(serializable)
    }
  }

  public registerHistoryComponent(serializable: new () => ISerializable): void {
    if (!this._historyComponents.includes(serializable)) {
      this._historyComponents.push(serializable)
    }
  }
}
