import { mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const setFontSize = vi.fn()
const formattingState = { showTextMenuButtons: true, fontSize: 24 }

vi.mock('../src/composables/useTextFormatting', () => ({
  useTextFormatting: () => ({
    state: formattingState,
    commands: { setFontSize },
    getMarkAttrs: () => null,
  }),
}))

// The real dropdown only mounts its content once open, and teleports it — render
// both slots inline so the preset rows are in the wrapper.
vi.mock('../src/components/buttons/MenuDropdown.vue', () => ({
  default: {
    name: 'MenuDropdown',
    template: '<div><slot name="button" /><slot name="dropdown" /></div>',
  },
}))

import TextFontSizeButton from '../src/components/buttons/text/TextFontSizeButton.vue'

function presetLabels(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.wov-option-label').map((node) => node.text())
}

describe('TextFontSizeButton', () => {
  beforeEach(() => {
    setFontSize.mockClear()
    formattingState.fontSize = 24
  })

  it('falls back to the default ladder', () => {
    const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1] } })

    expect(presetLabels(wrapper)).toEqual(['Small', 'Medium', 'Large', 'Huge'])
  })

  it('renders host-supplied sizes instead of the default ladder', async () => {
    const sizeOptions = [
      { label: 'Small', value: 67 },
      { label: 'Medium', value: 100 },
      { label: 'Large', value: 167 },
    ]
    const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1], sizeOptions } })

    expect(presetLabels(wrapper)).toEqual(['Small', 'Medium', 'Large'])

    await wrapper.findAll('.wov-font-size-option')[2].trigger('click')
    expect(setFontSize).toHaveBeenCalledWith(167)
  })

  describe('pxPerUnit', () => {
    // A print-pixel page: body text is stored as 100px but should read as 24
    const pxPerUnit = 100 / 24

    it('shows the stored size in menu units', () => {
      formattingState.fontSize = 100
      const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1], pxPerUnit } })

      expect((wrapper.find('.wov-custom-input').element as HTMLInputElement).value).toBe('24')
      // 100px is the scaled "Medium", so the button names the preset
      expect(wrapper.find('.wov-font-size-label').text()).toBe('Medium')
    })

    it('scales presets up to stored px when applied', async () => {
      formattingState.fontSize = 100
      const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1], pxPerUnit } })

      // "Huge" reads 96 in the menu and writes 400px
      await wrapper.findAll('.wov-font-size-option')[3].trigger('click')
      expect(setFontSize).toHaveBeenCalledWith(400)
    })

    it('scales a typed size up to stored px', async () => {
      formattingState.fontSize = 100
      const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1], pxPerUnit } })

      const input = wrapper.find('.wov-custom-input')
      ;(input.element as HTMLInputElement).value = '12'
      await input.trigger('change')

      expect(setFontSize).toHaveBeenCalledWith(50)
    })

    it('matches a preset despite rounding on the round-trip', () => {
      // "Small" is 16 units -> 66.666..px stored; it must still read as Small
      formattingState.fontSize = 16 * pxPerUnit
      const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1], pxPerUnit } })

      expect(wrapper.find('.wov-font-size-label').text()).toBe('Small')
    })

    it('leaves sizes alone by default', () => {
      const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1] } })

      expect((wrapper.find('.wov-custom-input').element as HTMLInputElement).value).toBe('24')
    })
  })

  it('labels the button from the supplied sizes', () => {
    // 24px is the current size; with this ladder it is no longer a preset
    const wrapper = mount(TextFontSizeButton, {
      props: {
        entityIds: [1],
        sizeOptions: [{ label: 'Medium', value: 100 }],
      },
    })

    expect(wrapper.find('.wov-font-size-label').text()).toBe('24 px')
  })

  describe('row previews', () => {
    const previewPx = (wrapper: VueWrapper): number[] =>
      wrapper
        .findAll('.wov-option-label')
        .map((node) => Number.parseFloat(node.attributes('style')!.match(/([\d.]+)px/)![1]))

    it('derives a rising preview from the ladder', () => {
      const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1] } })

      const sizes = previewPx(wrapper)
      expect(sizes).toEqual([...sizes].sort((a, b) => a - b))
      expect(sizes[0]).toBe(10)
      expect(sizes[sizes.length - 1]).toBe(20)
    })

    it('spaces previews by where each size sits, not by row order', () => {
      // 16 and 20 sit near each other; 96 is far above both
      const wrapper = mount(TextFontSizeButton, {
        props: {
          entityIds: [1],
          sizeOptions: [
            { label: 'Small', value: 16 },
            { label: 'Also small', value: 20 },
            { label: 'Huge', value: 96 },
          ],
        },
      })

      const [small, alsoSmall, huge] = previewPx(wrapper)
      expect(alsoSmall - small).toBeLessThan(huge - alsoSmall)
    })

    it('handles a single-preset ladder', () => {
      const wrapper = mount(TextFontSizeButton, {
        props: { entityIds: [1], sizeOptions: [{ label: 'Only', value: 24 }] },
      })

      expect(previewPx(wrapper)).toEqual([15])
    })
  })
})
