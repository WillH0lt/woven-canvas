import type { FontData, ISerializable } from './types.js'

export class Registry {
  private static _instance: Registry | null = null

  static get instance(): Registry {
    if (!Registry._instance) {
      Registry._instance = new Registry()
    }
    return Registry._instance
  }

  private readonly _historyComponents: (new () => ISerializable)[] = []
  private readonly _stateComponents: (new () => ISerializable)[] = []
  private readonly _fonts: Map<string, FontData> = new Map()

  private constructor() {}

  public get historyComponents(): (new () => ISerializable)[] {
    return this._historyComponents
  }

  public get stateComponents(): (new () => ISerializable)[] {
    return this._stateComponents
  }

  public getFont(name: string): FontData | undefined {
    return this._fonts.get(name)
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

  public registerFont(name: string, fontData: FontData): void {
    if (!this._fonts.has(name)) {
      this._fonts.set(name, Object.freeze(fontData))
    } else {
      console.warn(`Font "${name}" is already registered.`)
    }
  }
}
