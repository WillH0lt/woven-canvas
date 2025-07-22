import { BaseSystem, comps } from '@infinitecanvas/core'

export class PreCaptureHandleText extends BaseSystem {
  private readonly texts = this.query((q) => q.added.with(comps.Text).using(comps.Editable).write)

  public execute(): void {
    for (const textEntity of this.texts.added) {
      if (!textEntity.has(comps.Editable)) {
        textEntity.add(comps.Editable)
      }
    }
  }
}
