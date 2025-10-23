import type { BaseComponent } from '@infinitecanvas/core'
import { Block } from '@infinitecanvas/core/components'
import type { ICBaseBlock } from '@infinitecanvas/core/elements'
import { lowercaseFirstLetter } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'

export async function showElement(
  entity: Entity,
  components: (new () => BaseComponent)[],
  blockContainer: HTMLElement,
  options: { opacity?: number } = {},
): Promise<ICBaseBlock> {
  const block = entity.read(Block)

  const element = document.createElement(block.tag) as ICBaseBlock

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
  element.style.opacity = options.opacity?.toString() ?? '0'

  for (const Comp of components) {
    const value = entity.read(Comp)
    const name = lowercaseFirstLetter(Comp.name)

    // @ts-ignore
    ;(element as any)[name] = new Comp(value.toJson())
  }

  blockContainer.appendChild(element)

  await element?.updateComplete

  return element
}
