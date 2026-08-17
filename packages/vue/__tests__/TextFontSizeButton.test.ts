import { mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const setFontSize = vi.fn()

vi.mock('../src/composables/useTextFormatting', () => ({
  useTextFormatting: () => ({
    state: { showTextMenuButtons: true, fontSize: 24 },
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
  })

  it('falls back to the default ladder', () => {
    const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1] } })

    expect(presetLabels(wrapper)).toEqual(['Small', 'Medium', 'Large', 'Huge'])
  })

  it('renders host-supplied sizes instead of the default ladder', async () => {
    // An app whose page scale puts default text at 100px, not 24px
    const sizeOptions = [
      { label: 'Small', value: 67, displayValue: 10 },
      { label: 'Medium', value: 100, displayValue: 12 },
      { label: 'Large', value: 167, displayValue: 16 },
    ]
    const wrapper = mount(TextFontSizeButton, { props: { entityIds: [1], sizeOptions } })

    expect(presetLabels(wrapper)).toEqual(['Small', 'Medium', 'Large'])

    await wrapper.findAll('.wov-font-size-option')[2].trigger('click')
    expect(setFontSize).toHaveBeenCalledWith(167)
  })

  it('labels the button from the supplied sizes', () => {
    // 24px is the current size; with this ladder it is no longer a preset
    const wrapper = mount(TextFontSizeButton, {
      props: {
        entityIds: [1],
        sizeOptions: [{ label: 'Medium', value: 100, displayValue: 12 }],
      },
    })

    expect(wrapper.find('.wov-font-size-label').text()).toBe('24 px')
  })
})
