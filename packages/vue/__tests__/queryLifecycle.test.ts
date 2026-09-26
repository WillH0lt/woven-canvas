import {
  addComponent,
  Block,
  Camera,
  type Context,
  createEntity,
  defineCanvasComponent,
  type Editor,
  field,
  removeComponent,
  removeEntity,
  Selected,
} from '@woven-canvas/core'
import { type CanvasStore, Synced, type WebsocketAdapter } from '@woven-ecs/canvas-store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, createApp, defineComponent, h, inject, nextTick, type Ref, ref, watch } from 'vue'
import WovenCanvas from '../src/components/WovenCanvas.vue'
import { useComponent } from '../src/composables/useComponent'
import { type QueryResultItem, useQuery } from '../src/composables/useQuery'
import { WOVEN_CANVAS_KEY } from '../src/injection'

// Keep real ECS, store/history, Vue reactivity and Floating UI sync watchers.
// Asset persistence/uploads are unrelated and need IndexedDB in a browser.
vi.mock('@woven-canvas/asset-sync', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@woven-canvas/asset-sync')>()),
  AssetManager: class {
    async init() {}
    async resumePendingUploads() {}
    close() {}
    onUploadStart() {}
    onUploadComplete() {}
    onUploadError() {}
  },
}))

const Page = defineCanvasComponent({ name: 'testPage' }, { isSpread: field.boolean().default(false) })
type SelectedItems = Ref<QueryResultItem<[typeof Block, typeof Selected]>[]>
type PageItems = Ref<QueryResultItem<[typeof Page, typeof Block]>[]>
type Mutation = ReturnType<WebsocketAdapter['pull']>[number]
type Adapter = Pick<WebsocketAdapter, 'init' | 'close' | 'push' | 'pull'>

describe('query lifecycle with synchronous consumers', () => {
  let editor: Editor
  let store: CanvasStore
  let selected: SelectedItems
  let pages: PageItems
  let app: ReturnType<typeof createApp>
  let host: HTMLDivElement
  let canvas: Ref<{ render(): Promise<void> } | null>
  let observedTags: string[][]
  let observedCounts: number[]
  let errors: unknown[]
  let remoteMutations: Mutation[]
  let directEntity: Ref<number | null>
  let directBlock: ReturnType<typeof useComponent<typeof Block>>

  async function frame() {
    await canvas.value!.render()
    await nextTick()
  }

  async function settle() {
    for (let i = 0; i < 3; i++) await frame()
  }

  async function addPage(stableId: string, isSpread = false) {
    let id = 0
    editor.nextTick((ctx) => {
      id = createEntity(ctx)
      addComponent(ctx, id, Synced, { id: stableId })
      addComponent(ctx, id, Block, { tag: 'shape', rank: 'a0', position: [100, 100], size: [100, 100] })
      addComponent(ctx, id, Selected)
      addComponent(ctx, id, Page, { isSpread })
    })
    await settle()
    return id
  }

  beforeEach(async () => {
    observedTags = []
    observedCounts = []
    errors = []
    remoteMutations = []
    directEntity = ref(null)
    canvas = ref(null)
    let ready = false
    const DirectComponent = defineComponent({
      props: { entityId: { type: Number, required: true } },
      setup(props) {
        directBlock = useComponent(props.entityId, Block)
        return () => null
      },
    })
    const Probe = defineComponent({
      setup() {
        const context = inject(WOVEN_CANVAS_KEY)!
        selected = useQuery([Block, Selected])
        pages = useQuery([Page, Block])
        watch(
          selected,
          (rows) => {
            for (const row of rows) expect(context.hasEntity(row.entityId)).toBe(true)
          },
          { flush: 'sync' },
        )
        // Deliberately no null guards: this is useQuery's public contract.
        watch(
          () => selected.value.map((item) => item.block.value.tag),
          (tags) => observedTags.push(tags),
          { flush: 'sync' },
        )
        const count = computed(() => pages.value.reduce((sum, item) => sum + (item.testPage.value.isSpread ? 2 : 1), 0))
        watch(count, (value) => observedCounts.push(value), { flush: 'sync', immediate: true })
        return () => (directEntity.value === null ? null : h(DirectComponent, { entityId: directEntity.value }))
      },
    })
    app = createApp({
      render: () =>
        h(
          WovenCanvas,
          {
            ref: canvas,
            autoRender: false,
            editor: { plugins: [{ name: 'test-pages', components: [Page] }] },
            store: { history: { commitCheckpointAfterFrames: 1 } },
            onReady: (readyEditor: Editor, readyStore: CanvasStore) => {
              editor = readyEditor
              store = readyStore
              ready = true
            },
          },
          { default: () => h(Probe), toolbar: () => null },
        ),
    })
    app.config.errorHandler = (error) => errors.push(error)
    host = document.createElement('div')
    document.body.appendChild(host)
    app.mount(host)
    await vi.waitFor(() => expect(ready).toBe(true))
    // Inject a transport adapter at the store boundary. Real ECS mutation
    // application still happens inside store.sync, just as for WebSocket data.
    const remote: Adapter = {
      async init() {},
      close() {},
      push() {},
      pull: () => remoteMutations.splice(0),
    }
    ;(store as unknown as { adapters: Adapter[] }).adapters.push(remote)
    await settle()
  })

  afterEach(() => {
    app?.unmount()
    host?.remove()
    expect(errors).toEqual([])
  })

  it('removes undone creations from every query and restores them on redo', async () => {
    await addPage('undo-page', true)
    const retained = selected.value[0]!.block
    expect(observedCounts.at(-1)).toBe(2)
    expect(store.undo()).toBe(true)
    await frame()
    // Undo is applied after this tick's read boundary. Membership and snapshots
    // remain valid together until the following publication.
    expect(selected.value).toHaveLength(1)
    expect(pages.value).toHaveLength(1)
    expect(retained.value.tag).toBe('shape')
    await frame()
    expect(selected.value).toEqual([])
    expect(pages.value).toEqual([])
    expect(observedCounts.at(-1)).toBe(0)
    expect(retained.value.tag).toBe('shape')
    expect(store.redo()).toBe(true)
    await settle()
    expect(selected.value).toHaveLength(1)
    expect(pages.value).toHaveLength(1)
    expect(observedCounts.at(-1)).toBe(2)
  })

  it('keeps surviving selections and page counts when a remote patch removes components', async () => {
    await addPage('remote-page', true)
    const survivor = await addPage('survivor')
    // Origin.Websocket is 4 in canvas-store's internal mutation protocol.
    remoteMutations.push({
      origin: 4,
      syncBehavior: 'document',
      patch: {
        'remote-page/block': { _exists: false },
        'remote-page/testPage': { _exists: false },
      },
    })
    await frame()
    expect(selected.value).toHaveLength(2)
    expect(observedCounts.at(-1)).toBe(3)
    await frame()
    expect(selected.value.map((item) => item.entityId)).toEqual([survivor])
    expect(pages.value.map((item) => item.entityId)).toEqual([survivor])
    expect(observedCounts.at(-1)).toBe(1)
    expect(observedTags.at(-1)).toEqual(['shape'])
  })

  it('retains subscriptions when a component is removed and restored in one update', async () => {
    const id = await addPage('replacement')
    const retained = selected.value[0]!.block
    editor.nextTick((ctx) => {
      removeComponent(ctx, id, Block)
      addComponent(ctx, id, Block, { tag: 'frame', rank: 'a0', size: [200, 200] })
    })
    await settle()
    expect(selected.value).toHaveLength(1)
    expect(selected.value[0]!.block).toBe(retained)
    expect(retained.value.tag).toBe('frame')
    editor.nextTick((ctx) => Block.patch(ctx, id, { size: [300, 400] }))
    await settle()
    expect(retained.value.size).toEqual([300, 400])
  })

  it('does not republish a row until all required components have returned', async () => {
    const id = await addPage('partial')
    editor.nextTick((ctx) => {
      removeComponent(ctx, id, Block)
      removeComponent(ctx, id, Selected)
    })
    await frame()
    expect(selected.value).toHaveLength(1)
    await frame()
    expect(selected.value).toEqual([])
    editor.nextTick((ctx) => addComponent(ctx, id, Block, { tag: 'shape', rank: 'a0' }))
    await settle()
    expect(selected.value).toEqual([])
    editor.nextTick((ctx) => addComponent(ctx, id, Selected))
    await settle()
    expect(selected.value).toHaveLength(1)
  })

  it('preserves result-array identity on ordinary component edits', async () => {
    const id = await addPage('moving-page')
    const selection = selected.value
    const pageRows = pages.value
    editor.nextTick((ctx) => {
      Block.patch(ctx, id, { position: [200, 300] })
      Page.patch(ctx, id, { isSpread: true })
    })
    await settle()
    expect(selected.value).toBe(selection)
    expect(pages.value).toBe(pageRows)
    expect(selection[0]!.block.value.position).toEqual([200, 300])
    expect(observedCounts.at(-1)).toBe(2)
  })

  it('keeps query snapshots valid while direct component access becomes null', async () => {
    const id = await addPage('nullable-component', true)
    directEntity.value = id
    await nextTick()
    const retained = selected.value[0]!.block
    let invalidations = 0
    const stop = watch(
      directBlock,
      (value) => {
        if (value !== null) return
        invalidations++
        // Direct access is nullable; the query still owns its membership and
        // keeps valid snapshots until the ECS removal delta is available.
        expect(selected.value).toHaveLength(1)
        expect(pages.value).toHaveLength(1)
        expect(retained.value.tag).toBe('shape')
        expect(pages.value[0]!.testPage.value.isSpread).toBe(true)
      },
      { flush: 'sync' },
    )
    editor.nextTick((ctx) => removeComponent(ctx, id, Block))
    await frame()
    expect(directBlock.value).toBeNull()
    expect(invalidations).toBe(1)
    await frame()
    expect(selected.value).toEqual([])
    expect(pages.value).toEqual([])
    expect(retained.value.tag).toBe('shape')
    stop()
  })

  it('rebuilds a query once for a bulk removal and preserves retained snapshots', async () => {
    const ids: number[] = []
    editor.nextTick((ctx) => {
      for (let i = 0; i < 20; i++) {
        const id = createEntity(ctx)
        ids.push(id)
        addComponent(ctx, id, Block, { tag: 'shape', rank: 'a0' })
        addComponent(ctx, id, Selected)
      }
    })
    await settle()
    const retained = selected.value
    const memberships: number[] = []
    const stop = watch(selected, (rows) => memberships.push(rows.length), { flush: 'sync' })
    editor.nextTick((ctx) => {
      for (const id of ids) removeComponent(ctx, id, Block)
    })
    await frame()
    expect(selected.value).toBe(retained)
    await frame()
    expect(memberships).toEqual([0])
    expect(retained.every((row) => row.block.value.tag === 'shape')).toBe(true)
    stop()
  })

  it.each(['deselect', 'delete', 'delete-and-pan'] as const)('handles %s without null snapshots', async (mode) => {
    const id = await addPage('removed-page')
    editor.nextTick((ctx: Context) => {
      if (mode === 'deselect') removeComponent(ctx, id, Selected)
      else removeEntity(ctx, id)
      if (mode === 'delete-and-pan') Camera.patch(ctx, { left: 10 })
    })
    await settle()
    expect(selected.value).toEqual([])
    expect(pages.value).toHaveLength(mode === 'deselect' ? 1 : 0)
  })
})
