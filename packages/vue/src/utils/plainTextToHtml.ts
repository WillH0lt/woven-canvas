/**
 * Convert plain text to Tiptap-compatible HTML paragraphs.
 * Each line becomes a `<p>` element. HTML entities are escaped.
 */
export function plainTextToHtml(text: string): string {
  return text
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => {
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<p>${escaped || ''}</p>`
    })
    .join('')
}
