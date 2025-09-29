import type { Snapshot } from './History'
import type { State } from './State'
import { Selected, Text as TextComp } from './components'
import { TextAlign } from './types'
import type { ICText } from './webComponents/blocks'

type FormatType = 'bold' | 'italic' | 'underline' | 'align' | 'color'

const FORMAT_TAG_MAP = {
  bold: 'STRONG',
  italic: 'EM',
  underline: 'U',
  align: 'P',
  color: 'SPAN',
} as const

// Reusable DOM parser for efficiency
let _tempDiv: HTMLDivElement | null = null
function getTempDiv(): HTMLDivElement {
  if (!_tempDiv) {
    _tempDiv = document.createElement('div')
  }
  return _tempDiv
}

export async function applyBoldToSelected(state: State, blockContainer: HTMLElement, bold: boolean): Promise<Snapshot> {
  return formatSelected(state, blockContainer, 'bold', bold)
}

export function isSelectionBold(state: State): boolean {
  return isSelectionFormatted(state, 'bold')
}

export async function applyItalicToSelected(
  state: State,
  blockContainer: HTMLElement,
  italic: boolean,
): Promise<Snapshot> {
  return formatSelected(state, blockContainer, 'italic', italic)
}

export function isSelectionItalic(state: State): boolean {
  return isSelectionFormatted(state, 'italic')
}

export async function applyUnderlineToSelected(
  state: State,
  blockContainer: HTMLElement,
  underline: boolean,
): Promise<Snapshot> {
  return formatSelected(state, blockContainer, 'underline', underline)
}

export function isSelectionUnderlined(state: State): boolean {
  return isSelectionFormatted(state, 'underline')
}

export async function applyAlignmentToSelected(
  state: State,
  blockContainer: HTMLElement,
  alignment: TextAlign,
): Promise<Snapshot> {
  return formatSelectedCSS(state, blockContainer, 'align', `text-align: ${alignment}`)
}

export function getSelectionAlignment(state: State): TextAlign | null {
  const selectedIdsMap = state.getComponents(Selected).value
  const ids = Object.keys(selectedIdsMap)
  if (ids.length === 0) return null

  let firstAlignment: TextAlign | null = null

  for (const id of ids) {
    const text = state.getComponent(TextComp, id).value
    if (!text) continue

    const alignment = (getCSSPropertyValue(text.content, 'text-align') as TextAlign) || TextAlign.Left

    if (firstAlignment === null) {
      firstAlignment = alignment
    } else if (firstAlignment !== alignment) {
      return null // Different alignments across selection
    }
  }

  return firstAlignment || TextAlign.Left // Default to left if no alignment found
}

export function applyColorToSelected(state: State, blockContainer: HTMLElement, color: string): Promise<Snapshot> {
  return formatSelectedCSS(state, blockContainer, 'color', `color: ${color}`)
}

export function getSelectionColor(state: State): string | null {
  const selectedIdsMap = state.getComponents(Selected).value
  const ids = Object.keys(selectedIdsMap)
  if (ids.length === 0) return null

  let firstColor: string | null = null

  for (const id of ids) {
    const text = state.getComponent(TextComp, id).value
    if (!text) continue

    const color = getCSSPropertyValue(text.content, 'color')
    if (!color) continue

    if (firstColor === null) {
      firstColor = color
    } else if (firstColor.toLowerCase() !== color.toLowerCase()) {
      return null // Different colors across selection
    }
  }

  return firstColor
}

export async function applyFontSizeToSelected(
  state: State,
  blockContainer: HTMLElement,
  fontSize: number,
): Promise<Snapshot> {
  return applyTextPropertyToSelected(state, blockContainer, 'fontSize', fontSize)
}

export async function applyFontFamilyToSelected(
  state: State,
  blockContainer: HTMLElement,
  fontFamily: string,
): Promise<Snapshot> {
  return applyTextPropertyToSelected(state, blockContainer, 'fontFamily', fontFamily)
}
/**
 * Gets the value of a CSS property from HTML content
 */
function getCSSPropertyValue(htmlContent: string, property: string): string | null {
  const tempDiv = getTempDiv()
  tempDiv.innerHTML = htmlContent.trim()

  // Look for elements with the specified CSS property
  const elementWithStyle = tempDiv.querySelector(`*[style*="${property}"]`) as HTMLElement
  if (elementWithStyle) {
    return elementWithStyle.style.getPropertyValue(property).trim() || null
  }

  return null
}

function isSelectionFormatted(state: State, formatType: FormatType): boolean {
  const selectedIdsMap = state.getComponents(Selected).value
  const ids = Object.keys(selectedIdsMap)
  if (ids.length === 0) return false

  for (const id of ids) {
    const text = state.getComponent(TextComp, id).value
    if (!text) continue

    const isFormatted = isEntirelyFormatted(text.content, formatType)
    if (!isFormatted) return false
  }

  return true
}

async function formatSelected(
  state: State,
  blockContainer: HTMLElement,
  formatType: FormatType,
  isAddingFormat: boolean,
  cssStyle?: string,
): Promise<Snapshot> {
  const selectedIdsMap = state.getComponents(Selected).value
  const ids = Object.keys(selectedIdsMap)

  const snapshot: Snapshot = {}
  for (const id of ids) {
    const text = state.getComponent(TextComp, id).value
    if (!text) continue

    const isFormatted = isEntirelyFormatted(text.content, formatType, cssStyle)
    if (isAddingFormat === isFormatted) continue

    const element = blockContainer.querySelector(`[id="${id}"]`) as ICText
    if (!element) continue

    const content = isAddingFormat
      ? addFormatting(text.content, formatType, cssStyle)
      : removeFormatting(text.content, formatType, cssStyle)

    element.text = new TextComp({
      ...element.text,
      content,
    })

    await element.updateComplete

    const blockSnapshot = element.getSnapshot()

    Object.assign(snapshot, blockSnapshot)
  }

  return snapshot
}

async function formatSelectedCSS(
  state: State,
  blockContainer: HTMLElement,
  formatType: FormatType,
  cssStyle: string,
): Promise<Snapshot> {
  const selectedIdsMap = state.getComponents(Selected).value
  const ids = Object.keys(selectedIdsMap)

  const snapshot: Snapshot = {}
  for (const id of ids) {
    const text = state.getComponent(TextComp, id).value
    if (!text) continue

    // For CSS formatting, we always apply the style (no toggle logic needed here)
    const element = blockContainer.querySelector(`[id="${id}"]`) as ICText
    if (!element) continue

    const content = applyCSSFormatting(text.content, formatType, cssStyle)

    element.text = new TextComp({
      ...element.text,
      content,
    })

    await element.updateComplete

    const blockSnapshot = element.getSnapshot()

    Object.assign(snapshot, blockSnapshot)
  }

  return snapshot
}

// Helper function to get all text nodes
function getAllTextNodes(node: Node): Text[] {
  const textNodes: Text[] = []

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim()
    if (text) {
      // Only include non-empty text nodes
      textNodes.push(node as Text)
    }
  } else {
    for (const child of Array.from(node.childNodes)) {
      textNodes.push(...getAllTextNodes(child))
    }
  }

  return textNodes
}

/**
 * Checks if all text content in the HTML is wrapped by the specified formatting tags or has CSS styles
 * @param htmlContent - The HTML content to check
 * @param formatType - The type of formatting to check for
 * @param cssStyle - Optional CSS style to check for (e.g. "text-align: center", "color: red")
 * @returns true if all text has the specified formatting, false otherwise
 */
function isEntirelyFormatted(htmlContent: string, formatType: FormatType, cssStyle?: string): boolean {
  const tempDiv = getTempDiv()
  tempDiv.innerHTML = htmlContent.trim()

  // If CSS style is provided, check for CSS-based formatting
  if (cssStyle) {
    const [property, value] = cssStyle.split(':').map((s) => s.trim())

    // Look for elements with the matching CSS property
    const elementsWithStyle = tempDiv.querySelectorAll(`*[style*="${property}"]`)

    if (elementsWithStyle.length === 0) return false

    // Check if all elements with this style property have the expected value
    for (const element of Array.from(elementsWithStyle)) {
      const htmlElement = element as HTMLElement
      const styleValue = htmlElement.style.getPropertyValue(property).trim()
      if (styleValue !== value) return false
    }

    // For CSS-based formatting, we need to ensure all text is within styled elements
    const allTextNodes = getAllTextNodes(tempDiv)
    for (const textNode of allTextNodes) {
      const text = textNode.textContent?.trim()
      if (!text) continue // Skip empty text nodes

      // Check if this text node is within an element that has the required style
      let parent = textNode.parentElement
      let hasRequiredStyle = false

      while (parent && parent !== tempDiv) {
        const styleValue = parent.style.getPropertyValue(property).trim()
        if (styleValue === value) {
          hasRequiredStyle = true
          break
        }
        parent = parent.parentElement
      }

      if (!hasRequiredStyle) return false
    }

    return true
  }

  // Tag-based formatting logic (existing)
  const targetTag = FORMAT_TAG_MAP[formatType]

  // Check if a text node is wrapped by the target formatting element
  const isTextNodeFormatted = (textNode: Text): boolean => {
    let parent = textNode.parentElement
    while (parent && parent !== tempDiv) {
      if (parent.tagName === targetTag) return true
      parent = parent.parentElement
    }
    return false
  }

  // Get all text nodes
  const textNodes = getAllTextNodes(tempDiv)

  // If there are no text nodes, return false
  if (textNodes.length === 0) return false

  // Check if ALL text nodes are wrapped by the target formatting tags
  for (const textNode of textNodes) {
    if (!isTextNodeFormatted(textNode)) {
      return false
    }
  }

  return true
}

/**
 * Applies the specified formatting to HTML content (tags or CSS styles)
 * @param htmlContent - The HTML content to format
 * @param formatType - The type of formatting to apply
 * @param cssStyle - Optional CSS style to apply (e.g. "text-align: center", "color: red")
 * @returns HTML content with formatting applied
 */
function addFormatting(htmlContent: string, formatType: FormatType, cssStyle?: string): string {
  // If CSS style is provided, apply CSS-based formatting
  if (cssStyle) {
    return applyCSSFormatting(htmlContent, formatType, cssStyle)
  }

  // Tag-based formatting (existing logic)
  // First remove any existing formatting of the same type to avoid nested tags
  const cleanContent = removeFormatting(htmlContent, formatType)

  const tagName = FORMAT_TAG_MAP[formatType].toLowerCase()
  return `<${tagName}>${cleanContent}</${tagName}>`
}

/**
 * Removes the specified formatting from HTML content (tags or CSS styles)
 * @param htmlContent - The HTML content to remove formatting from
 * @param formatType - The type of formatting to remove
 * @param cssStyle - Optional CSS style to remove (e.g. "text-align: center", "color: red")
 * @returns HTML content with specified formatting removed
 */
function removeFormatting(htmlContent: string, formatType: FormatType, cssStyle?: string): string {
  // If CSS style is provided, remove CSS-based formatting
  if (cssStyle) {
    return removeCSSFormatting(htmlContent, cssStyle)
  }

  // Tag-based formatting (existing logic)
  const tagName = FORMAT_TAG_MAP[formatType].toLowerCase()

  // Fast path: if no tags of this type exist, return as-is
  if (!htmlContent.includes(`<${tagName}`)) {
    return htmlContent
  }

  // Use reusable DOM element for parsing
  const tempDiv = getTempDiv()
  tempDiv.innerHTML = htmlContent

  // Remove all formatting tags but keep their content
  const formatElements = tempDiv.querySelectorAll(tagName)
  for (const formatEl of Array.from(formatElements)) {
    // Replace the formatting element with its content
    const parent = formatEl.parentNode
    while (formatEl.firstChild) {
      parent?.insertBefore(formatEl.firstChild, formatEl)
    }
    parent?.removeChild(formatEl)
  }

  return tempDiv.innerHTML
}

/**
 * Applies CSS-based formatting to HTML content
 */
function applyCSSFormatting(htmlContent: string, formatType: FormatType, cssStyle: string): string {
  const tempDiv = getTempDiv()
  tempDiv.innerHTML = htmlContent.trim()

  const [property, value] = cssStyle.split(':').map((s) => s.trim())

  // First remove any existing CSS formatting of the same property
  const cleanedContent = removeCSSFormatting(htmlContent, cssStyle)
  tempDiv.innerHTML = cleanedContent

  // Get the appropriate tag name for the format type
  const tagName = FORMAT_TAG_MAP[formatType]
  const elementTagName = tagName.toLowerCase()

  // Always create a new wrapper element to ensure all content gets the formatting
  const wrapperElement = document.createElement(elementTagName)

  // Move all content into the wrapper
  while (tempDiv.firstChild) {
    wrapperElement.appendChild(tempDiv.firstChild)
  }

  // Remove any conflicting styles from nested elements to prevent style conflicts
  const nestedElementsWithSameProperty = wrapperElement.querySelectorAll(`*[style*="${property}"]`)
  for (const element of Array.from(nestedElementsWithSameProperty)) {
    const htmlElement = element as HTMLElement
    htmlElement.style.removeProperty(property)

    // If no other styles exist, remove the style attribute entirely
    if (!htmlElement.getAttribute('style') || htmlElement.getAttribute('style')?.trim() === '') {
      htmlElement.removeAttribute('style')
    }
  }

  // Apply the CSS style to the wrapper
  wrapperElement.style.setProperty(property, value)

  // Add the wrapper back to the container
  tempDiv.appendChild(wrapperElement)

  return tempDiv.innerHTML
}

/**
 * Removes CSS-based formatting from HTML content
 */
function removeCSSFormatting(htmlContent: string, cssStyle: string): string {
  const tempDiv = getTempDiv()
  tempDiv.innerHTML = htmlContent

  const [property] = cssStyle.split(':').map((s) => s.trim())

  // Find all elements that have any inline styles and check each one
  const elementsWithStyle = tempDiv.querySelectorAll('*[style]')
  for (const element of Array.from(elementsWithStyle)) {
    const htmlElement = element as HTMLElement

    // Check if this element has the property we want to remove
    if (htmlElement.style.getPropertyValue(property)) {
      htmlElement.style.removeProperty(property)

      // If no other styles exist, remove the element
      if (!htmlElement.getAttribute('style') || htmlElement.getAttribute('style')?.trim() === '') {
        const parent = htmlElement.parentNode
        while (htmlElement.firstChild) {
          parent?.insertBefore(htmlElement.firstChild, htmlElement)
        }
        parent?.removeChild(htmlElement)
      }
    }
  }

  return tempDiv.innerHTML
}

async function applyTextPropertyToSelected(
  state: State,
  blockContainer: HTMLElement,
  name: string,
  value: any,
): Promise<Snapshot> {
  const selectedIds = state.getComponents(Selected).value
  const ids = Object.keys(selectedIds)

  const snapshot: Snapshot = {}
  for (const id of ids) {
    const text = state.getComponent(TextComp, id).value
    if (!text) continue

    const element = blockContainer.querySelector(`[id="${id}"]`) as ICText
    if (!element) continue

    element.text = new TextComp({
      ...element.text,
      [name]: value,
    })

    await element.updateComplete

    const blockSnapshot = element.getSnapshot()
    blockSnapshot[id].Text[name] = value

    Object.assign(snapshot, blockSnapshot)
  }

  return snapshot
}
