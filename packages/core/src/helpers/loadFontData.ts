import type { FontData } from '../types.js'

export async function loadFontData(fntUrl: string): Promise<FontData> {
  const res = await fetch(fntUrl)
  if (!res.ok) {
    throw new Error(`Failed to load font file: ${res.statusText}`)
  }
  const xmlText = await res.text()
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'application/xml')

  const data: FontData = {
    face: '',
    chars: {},
    pages: [],
    lineHeight: 0,
    fontSize: 0,
    fontFamily: '',
    distanceField: {
      type: 'none',
      range: 0,
    },
    baseLineOffset: 0,
  }

  const info = xml.getElementsByTagName('info')[0]
  const common = xml.getElementsByTagName('common')[0]
  const distanceField = xml.getElementsByTagName('distanceField')[0]

  if (distanceField) {
    data.distanceField = {
      type: distanceField.getAttribute('fieldType') as 'sdf' | 'msdf' | 'none',
      range: Number.parseInt(distanceField.getAttribute('distanceRange') || '0'),
    }
  }

  // pages and chars:
  const page = xml.getElementsByTagName('page')
  const char = xml.getElementsByTagName('char')
  const kerning = xml.getElementsByTagName('kerning')

  data.face = info.getAttribute('face') || ''
  data.fontSize = Number.parseInt(info.getAttribute('size') || '0')
  data.fontFamily = info.getAttribute('face') || ''
  data.lineHeight = Number.parseInt(common.getAttribute('lineHeight') || '0')

  for (let i = 0; i < page.length; i++) {
    data.pages.push({
      id: Number.parseInt(page[i].getAttribute('id') || '0'),
      file: page[i].getAttribute('file') || '',
    })
  }

  const map: Record<string, string> = {}

  data.baseLineOffset = data.lineHeight - Number.parseInt(common.getAttribute('base') || '0')

  for (let i = 0; i < char.length; i++) {
    const charNode = char[i]
    const id = Number.parseInt(charNode.getAttribute('id') || '0')

    let letter = charNode.getAttribute('letter') ?? charNode.getAttribute('char') ?? String.fromCharCode(id)

    if (letter === 'space') letter = ' '

    map[id] = letter

    data.chars[letter] = {
      id,
      letter,
      // texture deets..
      page: Number.parseInt(charNode.getAttribute('page') || '0'),
      x: Number.parseInt(charNode.getAttribute('x') || '0'),
      y: Number.parseInt(charNode.getAttribute('y') || '0'),
      width: Number.parseInt(charNode.getAttribute('width') || '0'),
      height: Number.parseInt(charNode.getAttribute('height') || '0'),

      // render deets..
      xOffset: Number.parseInt(charNode.getAttribute('xoffset') || '0'),
      yOffset: Number.parseInt(charNode.getAttribute('yoffset') || '0'), // + baseLineOffset,
      xAdvance: Number.parseInt(charNode.getAttribute('xadvance') || '0'),
      kerning: {},
    }
  }

  for (let i = 0; i < kerning.length; i++) {
    const first = Number.parseInt(kerning[i].getAttribute('first') || '0')
    const second = Number.parseInt(kerning[i].getAttribute('second') || '0')
    const amount = Number.parseInt(kerning[i].getAttribute('amount') || '0')

    data.chars[map[second]].kerning[map[first]] = amount
  }

  return data
}
