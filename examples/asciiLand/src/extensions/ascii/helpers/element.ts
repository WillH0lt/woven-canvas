import { Block } from '@infinitecanvas/core/components'
import type { ICBaseBlock } from '@infinitecanvas/core/elements'
import { lowercaseFirstLetter } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'
import type { AsciiResources } from '../types'

export async function showElement(
  entity: Entity,
  resources: AsciiResources,
  options: { opacity?: number; isEditing?: boolean } = {},
): Promise<ICBaseBlock> {
  const block = entity.read(Block)
  const blockDef = resources.blockDefs[block.tag]

  let element = document.getElementById(block.id) as ICBaseBlock | null
  if (!element) {
    element = document.createElement(block.tag) as ICBaseBlock
    resources.blockContainer.appendChild(element)
  }

  element.id = block.id
  element.blockId = block.id
  element.style.position = 'absolute'
  element.style.userSelect = 'none'
  element.style.pointerEvents = 'none'
  element.style.display = 'block'

  element.style.left = `${block.left}px`
  element.style.top = `${block.top}px`
  element.style.width = `${block.width}px`
  element.style.height = `${block.height}px`
  element.style.backgroundColor = resources.fontData.backgroundColor
  element.style.opacity = options.opacity?.toString() ?? '0'

  if (options.isEditing) {
    element.setAttribute('is-editing', 'true')
  }

  for (const Comp of blockDef.components) {
    const value = entity.read(Comp)
    const name = lowercaseFirstLetter(Comp.name)

    // @ts-ignore
    ;(element as any)[name] = new Comp(value.toJson())
  }

  element.requestUpdate()
  await element?.updateComplete

  return element
}

export function removeElement(blockId: string): void {
  const element = document.getElementById(blockId)
  element?.remove()
}
