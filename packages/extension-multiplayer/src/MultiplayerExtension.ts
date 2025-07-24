import { BaseExtension, type BaseResources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems'

export class MultiplayerExtension extends BaseExtension {
  public name = 'multiplayer'

  public async preBuild(resources: BaseResources): Promise<void> {
    this._preUpdateGroup = System.group(sys.PreUpdateSync, { resources })
  }
}
