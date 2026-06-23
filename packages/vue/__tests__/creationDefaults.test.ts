import { describe, expect, it } from 'vitest'
import { applyCreationDefaults, type BlockSnapshot } from '../src/helpers/snapshot'

/** Build a `getDefaults(component)` reader from a plain record (as the editing plugin resource does). */
const defaultsFrom =
  (record: Record<string, Record<string, unknown>>) =>
  (component: string): Record<string, unknown> =>
    record[component] ?? {}

describe('applyCreationDefaults', () => {
  it('fills a field the snapshot omits from the defaults', () => {
    const snapshot: BlockSnapshot = { block: { tag: 'text', size: [10, 29] }, text: { constrainWidth: false } }
    const result = applyCreationDefaults(snapshot, defaultsFrom({ text: { fontFamily: 'Lato', fontSizePx: 100 } }))

    expect(result.text).toEqual({ fontFamily: 'Lato', fontSizePx: 100, constrainWidth: false })
  })

  it('lets explicit snapshot values win over the defaults', () => {
    const snapshot: BlockSnapshot = { block: { tag: 'text' }, text: { fontFamily: 'Times New Roman' } }
    const result = applyCreationDefaults(snapshot, defaultsFrom({ text: { fontFamily: 'Lato' } }))

    expect(result.text).toEqual({ fontFamily: 'Times New Roman' })
  })

  it('does not mutate the input snapshot', () => {
    const snapshot: BlockSnapshot = { block: { tag: 'text' }, text: { constrainWidth: false } }
    applyCreationDefaults(snapshot, defaultsFrom({ text: { fontFamily: 'Lato' } }))

    expect(snapshot.text).toEqual({ constrainWidth: false })
  })

  it('never applies defaults to the block key', () => {
    const snapshot: BlockSnapshot = { block: { tag: 'text', size: [10, 29] } }
    const result = applyCreationDefaults(
      snapshot,
      defaultsFrom({ block: { size: [999, 999] }, text: { fontFamily: 'Lato' } }),
    )

    expect(result.block).toEqual({ tag: 'text', size: [10, 29] })
  })

  it('returns the same snapshot when nothing merges (no defaults / no matching component)', () => {
    const snapshot: BlockSnapshot = { block: { tag: 'text' }, text: { constrainWidth: false } }

    // no getDefaults reader at all
    expect(applyCreationDefaults(snapshot, undefined)).toBe(snapshot)
    // 'text' has no registered defaults → nothing to merge
    expect(applyCreationDefaults(snapshot, defaultsFrom({}))).toBe(snapshot)
    // a component the snapshot doesn't mention is ignored
    expect(applyCreationDefaults(snapshot, defaultsFrom({ shape: { kind: 'rectangle' } }))).toBe(snapshot)
  })
})
