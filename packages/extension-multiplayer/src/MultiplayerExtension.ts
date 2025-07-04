import { Extension, type Resources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems'

export class MultiplayerExtension extends Extension {
  public async preBuild(resources: Resources): Promise<void> {
    this._preUpdateGroup = System.group(sys.PreUpdateSync, { resources })
  }
}
