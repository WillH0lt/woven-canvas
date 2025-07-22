import type { Block, Text } from '@infinitecanvas/core/components'

export function calculateTextHeight(block: Block, text: Text): number {
  const tempDiv = document.createElement('div')
  tempDiv.style.position = 'absolute'
  tempDiv.style.visibility = 'hidden'
  tempDiv.style.width = `${block.width}px`
  tempDiv.style.fontSize = `${text.fontSize}px`
  tempDiv.style.fontFamily = text.fontFamily
  tempDiv.style.textAlign = text.align
  tempDiv.style.lineHeight = `${text.lineHeight}`
  tempDiv.innerHTML = text.content

  document.body.appendChild(tempDiv)
  const height = tempDiv.clientHeight
  document.body.removeChild(tempDiv)

  return height
}
