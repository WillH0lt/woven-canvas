export interface RenderedLine {
  text: string
  rect: DOMRect // bounding box (union of character rects for the line)
  // optional debug info
  startNode?: Text
  startOffset?: number // code-unit offset in startNode
  endNode?: Text
  endOffset?: number // code-unit offset (exclusive) in endNode
}

interface MeasureOptions {
  /** pixel tolerance to detect a new line (default 2) */
  lineThreshold?: number
  /** if true, wait for document.fonts.ready before measuring (default true if `document.fonts` exists) */
  waitForFonts?: boolean
}

/**
 * Synchronous measurement function (does NOT wait for fonts).
 * Use the async wrapper below if you need to wait for webfonts.
 */
export function getLines(element: HTMLElement, options: Partial<MeasureOptions> = {}): RenderedLine[] {
  const lineThreshold = options.lineThreshold ?? 2

  const range = document.createRange()
  const lines: RenderedLine[] = []

  let currentText = ''
  let currentRect: DOMRect | null = null
  let currentY: number | null = null

  // track start/end for debug / mapping
  let lineStartNode: Text | undefined
  let lineStartOffset: number | undefined
  let lastNode: Text | undefined
  let lastOffset: number | undefined

  const elementRect = element.getBoundingClientRect()

  const cloneRect = (rect: DOMRect) => new DOMRect(rect.left, rect.top, rect.width, rect.height)

  const mergeRect = (existing: DOMRect | null, rect: DOMRect): DOMRect => {
    if (!existing) {
      return cloneRect(rect)
    }

    const left = Math.min(existing.left, rect.left)
    const top = Math.min(existing.top, rect.top)
    const right = Math.max(existing.right, rect.right)
    const bottom = Math.max(existing.bottom, rect.bottom)

    return new DOMRect(left, top, right - left, bottom - top)
  }

  const getCharacterRect = (): DOMRect | null => {
    const rects = Array.from(range.getClientRects())
    for (const rect of rects) {
      if (rect.width > 0 || rect.height > 0) {
        return cloneRect(rect)
      }
    }

    const rect = range.getBoundingClientRect()
    if (rect.width > 0 || rect.height > 0) {
      return cloneRect(rect)
    }

    return null
  }

  const commitLine = (force = false) => {
    if (!force && currentText.length === 0) {
      return
    }

    const rect = currentRect ?? new DOMRect(elementRect.left, currentY ?? elementRect.top, 0, 0)

    lines.push({
      text: currentText,
      rect,
      startNode: lineStartNode,
      startOffset: lineStartOffset,
      endNode: lastNode,
      endOffset: lastOffset,
    })

    currentText = ''
    currentRect = null
    currentY = null
    lineStartNode = undefined
    lineStartOffset = undefined
    lastNode = undefined
    lastOffset = undefined
  }

  const paragraphStack: Array<{ element: HTMLElement; hadContent: boolean }> = []

  const markParagraphHasContent = () => {
    const current = paragraphStack[paragraphStack.length - 1]
    if (current) {
      current.hadContent = true
    }
  }

  const pushEmptyParagraph = (paragraph: HTMLElement) => {
    const rect = paragraph.getBoundingClientRect()
    lines.push({
      text: '',
      rect: new DOMRect(rect.left, rect.top, rect.width, rect.height),
    })
  }

  const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff
  const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff

  const processTextNode = (textNode: Text) => {
    const text = textNode.data
    if (text.length === 0) {
      return
    }

    markParagraphHasContent()

    for (let offset = 0; offset < text.length; ) {
      const code = text.charCodeAt(offset)
      let length = 1

      if (isHighSurrogate(code) && offset + 1 < text.length) {
        const nextCode = text.charCodeAt(offset + 1)
        if (isLowSurrogate(nextCode)) {
          length = 2
        }
      }

      const char = text.slice(offset, offset + length)

      if (char === '\r') {
        offset += length
        continue
      }

      if (char === '\n') {
        // preserve explicit line breaks
        commitLine(true)
        offset += length
        continue
      }

      range.setStart(textNode, offset)
      range.setEnd(textNode, offset + length)

      const rect = getCharacterRect()

      if (rect) {
        if (currentY === null) {
          currentY = rect.top
          if (!lineStartNode) {
            lineStartNode = textNode
            lineStartOffset = offset
          }
        } else if (Math.abs(rect.top - currentY) > lineThreshold) {
          commitLine()
          currentY = rect.top
          lineStartNode = textNode
          lineStartOffset = offset
        }

        currentRect = mergeRect(currentRect, rect)
      } else if (!lineStartNode) {
        lineStartNode = textNode
        lineStartOffset = offset
      }

      currentText += char
      lastNode = textNode
      lastOffset = offset + length

      offset += length
    }
  }

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node as Text)
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return
    }

    const elementNode = node as HTMLElement
    const tagName = elementNode.tagName.toLowerCase()

    const isParagraph = tagName === 'p'

    if (tagName === 'br') {
      markParagraphHasContent()
      commitLine(true)
      currentY = null
      lineStartNode = undefined
      lineStartOffset = undefined
      return
    }

    if (isParagraph) {
      // finish any in-progress line before starting a new paragraph
      commitLine()

      paragraphStack.push({ element: elementNode, hadContent: false })
      currentY = null
      lineStartNode = undefined
      lineStartOffset = undefined
    }

    for (const child of Array.from(node.childNodes)) {
      processNode(child)
    }

    if (isParagraph) {
      const paragraphState = paragraphStack.pop()
      // flush remaining characters collected while inside this paragraph
      commitLine()

      if (!paragraphState?.hadContent) {
        pushEmptyParagraph(elementNode)
      }

      currentY = null
      lineStartNode = undefined
      lineStartOffset = undefined
    }
  }

  processNode(element)

  commitLine()
  range.detach?.()

  return lines
}
