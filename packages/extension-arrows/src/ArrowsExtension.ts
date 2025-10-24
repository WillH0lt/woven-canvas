import { BaseExtension, type BaseResources, ComponentRegistry } from '@infinitecanvas/core'
import { Color, Connector } from '@infinitecanvas/core/components'

import { ArcArrow, ArrowTrim, ElbowArrow } from './components'
import * as sys from './systems'
import './webComponents'
import { Options, type OptionsInput } from './types'

class ArrowsExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-arc-arrow',
      editOptions: {
        canEdit: true,
      },
      resizeMode: 'groupOnly' as const,
      components: [ArcArrow, Color, Connector, ArrowTrim],
    },
    {
      tag: 'ic-elbow-arrow',
      editOptions: {
        canEdit: true,
      },
      resizeMode: 'groupOnly' as const,
      components: [ElbowArrow, Color, Connector, ArrowTrim],
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

  private options: Options

  constructor(options: OptionsInput) {
    super()
    this.options = Options.parse(options)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(ArcArrow)
    ComponentRegistry.instance.registerComponent(ElbowArrow)

    const arrowResources = {
      ...resources,
      ...this.options,
    }

    this.captureGroup = this.createGroup(arrowResources, sys.CaptureArrowDraw, sys.CaptureArrowTransform)

    this.updateGroup = this.createGroup(arrowResources, sys.UpdateArrowTransform, sys.UpdateArrowHitGeometry)
  }
}

export const ArrowsExtension = (options: OptionsInput = {}) => new ArrowsExtensionClass(options)
