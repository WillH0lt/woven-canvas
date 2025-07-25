import { BaseSystem, type CommandArgs, CoreCommand, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'

import type { EditableTextElement } from '../floatingMenuButtons'
import type { TextEditorResources } from '../types'

export class UpdateText extends BaseSystem<CommandArgs> {
  protected declare readonly resources: TextEditorResources

  private readonly editedTexts = this.query(
    (q) => q.added.removed.with(comps.Block, comps.Text, comps.Edited).write.using(comps.Opacity).write,
  )

  public execute(): void {
    for (const textEntity of this.editedTexts.added) {
      if (!textEntity.has(comps.Opacity)) {
        textEntity.add(comps.Opacity, { value: 0 })
      }
    }

    for (const textEntity of this.editedTexts.removed) {
      if (!textEntity.alive) continue

      if (textEntity.has(comps.Opacity)) {
        textEntity.remove(comps.Opacity)
      }

      this.saveChanges(textEntity)
    }
  }

  private saveChanges(textEntity: Entity): void {
    if (!textEntity.has(comps.Text)) return

    const block = textEntity.write(comps.Block)
    const element = this.resources.viewport.querySelector<EditableTextElement>(`[id='${block.id}']`)
    if (!element) return

    const content = element.getEditorContent()
    if (content === null) return

    const size = element.getEditorSize()
    if (size === null) return

    const text = textEntity.write(comps.Text)
    text.content = content

    block.width = size.width
    block.height = size.height

    this.emitCommand(CoreCommand.CreateCheckpoint)
  }
}
