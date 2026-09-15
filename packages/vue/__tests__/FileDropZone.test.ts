import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { Camera, Editor, Screen } from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import FileDropZone from '../src/components/FileDropZone.vue'

const { nextEditorTick, getEditor, createImageBlock } = vi.hoisted(() => ({
  nextEditorTick: vi.fn(),
  getEditor: vi.fn(),
  createImageBlock: vi.fn(),
}))

vi.mock('../src/composables/useEditorContext', () => ({
  useEditorContext: () => ({ nextEditorTick, getEditor }),
}))
vi.mock('../src/composables/useImageCreation', () => ({
  useImageCreation: () => ({ createImageBlock }),
}))

describe('FileDropZone', () => {
  let container: HTMLDivElement
  let child: HTMLDivElement
  let wrapper: VueWrapper
  let editor: Editor
  let readonly: boolean

  function drag(
    type: string,
    target: EventTarget = container,
    types = ['Files'],
    files: File[] = [],
    payload: Record<string, string> = {},
  ) {
    // jsdom has no DragEvent/DataTransfer. Supply the browser's protected-mode
    // payload explicitly: files are empty on enter, populated only on drop.
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 210, clientY: 120 })
    Object.defineProperty(event, 'dataTransfer', {
      value: { types, files, dropEffect: 'none', getData: (type: string) => payload[type] ?? '' },
    })
    target.dispatchEvent(event)
    return event
  }

  function isActive() {
    return wrapper.classes().includes('wov-drag-over')
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    readonly = false
    getEditor.mockImplementation(() => ({ readonly }))
    container = document.createElement('div')
    child = document.createElement('div')
    container.append(child)
    document.body.append(container)
    editor = new Editor(container)
    await editor.initialize()
    const ctx = editor._getContext()
    Object.assign(Camera.write(ctx), { left: 100, top: 200, zoom: 2 })
    Object.assign(Screen.write(ctx), { left: 10, top: 20 })
    nextEditorTick.mockResolvedValue(ctx)
    wrapper = mount(FileDropZone, {
      attachTo: container,
      global: { provide: { containerRef: shallowRef(container) } },
    })
  })

  afterEach(async () => {
    wrapper.unmount()
    await editor.dispose()
    container.remove()
    vi.unstubAllGlobals()
  })

  it('prevents a native selection drag on the canvas and ignores its HTML payload', async () => {
    expect(drag('dragstart', child, ['text/html']).defaultPrevented).toBe(true)
    drag('dragenter', child, ['text/html'])
    await nextTick()
    expect(isActive()).toBe(false)
    expect(drag('dragover', wrapper.element, ['text/html']).defaultPrevented).toBe(false)
    drag('drop', wrapper.element, ['text/html'], [], { 'text/html': '<b>Selected text</b>' })
    await flushPromises()
    expect(createImageBlock).not.toHaveBeenCalled()
    expect(nextEditorTick).not.toHaveBeenCalled()
  })

  it('does not upload an internal native image drag, even if it contains a file', async () => {
    drag('dragstart', child)
    drag('dragenter', wrapper.element)
    drag('drop', wrapper.element, ['Files'], [new File(['image'], 'image.png', { type: 'image/png' })])
    await flushPromises()
    expect(createImageBlock).not.toHaveBeenCalled()
    expect(isActive()).toBe(false)
  })

  it('preserves contenteditable drags without activating the image overlay', async () => {
    child.setAttribute('contenteditable', 'true')
    expect(drag('dragstart', child, ['text/html']).defaultPrevented).toBe(false)
    drag('dragenter', child, ['text/html'])
    await nextTick()
    expect(isActive()).toBe(false)
  })

  it('imports external files at the camera-adjusted drop position after an internal drag ends', async () => {
    drag('dragstart', child)
    drag('dragend', child)
    drag('dragenter')
    await nextTick()
    expect(isActive()).toBe(true)
    expect(drag('dragover', wrapper.element).defaultPrevented).toBe(true)
    const file = new File(['image'], 'image.png', { type: 'image/png' })
    drag('drop', wrapper.element, ['Files'], [file])
    await flushPromises()
    expect(createImageBlock).toHaveBeenCalledExactlyOnceWith(file, 200, 250, { maxSize: 400 })
    expect(isActive()).toBe(false)
  })

  it('preserves external browser-image drops', async () => {
    const fetchImage = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['image'], { type: 'image/png' }),
    })
    vi.stubGlobal('fetch', fetchImage)
    drag('dragenter', container, ['text/html'])
    await nextTick()
    expect(isActive()).toBe(true)
    drag('drop', wrapper.element, ['text/html'], [], { 'text/html': '<img src="https://example.com/image.png">' })
    await flushPromises()
    expect(fetchImage).toHaveBeenCalledWith('https://example.com/image.png')
    expect(createImageBlock).toHaveBeenCalledExactlyOnceWith(expect.any(File), 200, 250, { maxSize: 400 })
    expect(isActive()).toBe(false)
  })

  it('allows native image drags from outside the canvas in the same document', async () => {
    const source = document.createElement('img')
    document.body.append(source)
    try {
      expect(drag('dragstart', source).defaultPrevented).toBe(false)
      drag('dragenter')
      await nextTick()
      expect(isActive()).toBe(true)
      const file = new File(['image'], 'image.png', { type: 'image/png' })
      drag('drop', wrapper.element, ['Files'], [file])
      await flushPromises()
      expect(createImageBlock).toHaveBeenCalledExactlyOnceWith(file, 200, 250, { maxSize: 400 })
    } finally {
      source.remove()
    }
  })

  it('recovers from ignored text drags and unmatched leaves without flickering on child transitions', async () => {
    drag('dragenter', child, ['text/plain'])
    drag('dragleave', child, ['text/plain'])
    drag('dragenter')
    await nextTick()
    expect(isActive()).toBe(true)
    drag('dragenter', child)
    drag('dragleave', container)
    await nextTick()
    expect(isActive()).toBe(true)
    drag('dragleave', child)
    await nextTick()
    expect(isActive()).toBe(false)
  })

  it.each(['dragend', 'blur', 'pointerdown', 'drop'])('clears a stranded overlay on window %s', async (type) => {
    drag('dragenter')
    await nextTick()
    expect(isActive()).toBe(true)
    window.dispatchEvent(new Event(type))
    await nextTick()
    expect(isActive()).toBe(false)
  })

  it('rechecks readonly when accepting a drop', async () => {
    drag('dragenter')
    await nextTick()
    expect(isActive()).toBe(true)
    readonly = true
    drag('drop', wrapper.element, ['Files'], [new File(['image'], 'image.png', { type: 'image/png' })])
    await flushPromises()
    expect(createImageBlock).not.toHaveBeenCalled()
    expect(isActive()).toBe(false)
  })

  it('removes native drag prevention on unmount', () => {
    wrapper.unmount()
    expect(drag('dragstart', child).defaultPrevented).toBe(false)
  })
})
