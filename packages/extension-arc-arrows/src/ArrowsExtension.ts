import { BaseExtension, type BaseResources, ComponentRegistry } from '@infinitecanvas/core'
import {} from '@infinitecanvas/core'
import { Color, Connector, Text } from '@infinitecanvas/core/components'

import { ArcArrow, ArrowTrim, ElbowArrow } from './components'
import * as sys from './systems'
import './webComponents'

class ArrowsExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-arc-arrow',
      editOptions: {
        canEdit: true,
      },
      resizeMode: 'groupOnly' as const,
      components: [ArcArrow, Color, Text, Connector, ArrowTrim],
    },
    {
      tag: 'ic-elbow-arrow',
      editOptions: {
        canEdit: true,
      },
      resizeMode: 'groupOnly' as const,
      components: [ElbowArrow, Color, Text, Connector, ArrowTrim],
    },
  ]

  public readonly tools = [
    {
      name: 'arc arrow',
      buttonTag: 'ic-arc-arrow-tool',
      buttonTooltip: 'Arc Arrow',
    },
    {
      name: 'elbow arrow',
      buttonTag: 'ic-elbow-arrow-tool',
      buttonTooltip: 'Elbow Arrow',
    },
  ]

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(ArcArrow)
    ComponentRegistry.instance.registerComponent(ElbowArrow)

    this.captureGroup = this.createGroup(resources, sys.CaptureArrowDraw, sys.CaptureArrowTransform)

    this.updateGroup = this.createGroup(resources, sys.UpdateArrowTransform, sys.UpdateArrowHitGeometry)
  }
}

export const ArrowsExtension = () => new ArrowsExtensionClass()
