import { BaseExtension, type BaseResources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems'

class MultiplayerExtensionClass extends BaseExtension {
  public async preBuild(resources: BaseResources): Promise<void> {
    this.preUpdateGroup = System.group(sys.PreUpdateSync, { resources })
  }
}

export const MultiplayerExtension = () => new MultiplayerExtensionClass()
