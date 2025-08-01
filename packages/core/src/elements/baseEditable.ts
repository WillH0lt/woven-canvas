import { property } from 'lit/decorators/property.js'

import type { Snapshot } from '../History'
import { BaseElement } from './base'

export abstract class BaseEditable extends BaseElement {
  @property({ type: Boolean })
  public editing = false

  public abstract getSnapshot(): Snapshot
}
