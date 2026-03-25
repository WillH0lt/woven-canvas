import {
  Aabb,
  addComponent,
  Block,
  Camera,
  type ComponentDef,
  type Context,
  canBlockEdit,
  createEntity,
  defineQuery,
  type EditorResources,
  type EntityId,
  Grid,
  getResources,
  hasComponent,
  Mouse,
  RankBounds,
  removeEntity,
  Synced,
  Text,
} from '@woven-canvas/core'
import { Aabb as AabbNs, Vec2 } from '@woven-canvas/math'
import {
  DeselectAll,
  deselectAll,
  EditAfterPlacing,
  SelectBlock,
  Selected,
  selectBlock,
} from '@woven-canvas/plugin-selection'
import { onMounted, onUnmounted, type Ref, watch } from 'vue'
import { MIN_WRAP_WIDTH, PASTE_WRAP_CHAR_THRESHOLD } from '../constants'
import { createBlockFromSnapshot } from '../systems/blockPlacementSystem'
import { plainTextToHtml } from '../utils/plainTextToHtml'
import { useEditorContext } from './useEditorContext'
import { useTextEditorController } from './useTextEditorController'

const CLIPBOARD_FORMAT_VERSION = 1
const SYNCED_KEY = 'Synced'
const BLOCK_CLIPBOARD_TYPE = 'application/x-woven-canvas'

type ClipboardEntityData = Map<number, unknown>

interface ClipboardJson {
  version: number
  center: [number, number]
  entities: Array<Record<string, unknown>>
}

// Re-use the CopyPasteOptions type defined in WovenCanvasCore
import type { CopyPasteOptions } from '../components/WovenCanvasCore.vue'

const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected))

// --- Serialization ---

function serializeSelectedBlocks(ctx: Context): ClipboardJson | null {
  const selectedBlocks = [...selectedBlocksQuery.current(ctx)]
  if (selectedBlocks.length === 0) return null

  const { componentsById } = getResources<EditorResources>(ctx)
  const documentComponents = new Map([...componentsById].filter(([, def]) => def.sync === 'document'))
  const syncedComponentId = Synced._getComponentId(ctx)

  const entities: Array<Record<string, unknown>> = []
  const unionAabb = AabbNs.zero()
  let hasAabb = false

  for (const entityId of selectedBlocks) {
    const entityObj: Record<string, unknown> = {}

    if (hasComponent(ctx, entityId, Synced)) {
      entityObj[SYNCED_KEY] = Synced.snapshot(ctx, entityId)
    }

    for (const componentId of ctx.entityBuffer.getComponentIds(entityId)) {
      if (componentId === syncedComponentId) continue
      const componentDef = documentComponents.get(componentId)
      if (componentDef) {
        const snapshot = componentDef.snapshot(ctx, entityId)
        const converted = convertRefsToUuids(ctx, componentDef.schema, snapshot)
        entityObj[componentDef.name] = converted
      }
    }

    entities.push(entityObj)

    if (hasComponent(ctx, entityId, Aabb)) {
      const { value } = Aabb.read(ctx, entityId)
      if (!hasAabb) {
        AabbNs.copy(unionAabb, value)
        hasAabb = true
      } else {
        AabbNs.union(unionAabb, value)
      }
    }
  }

  return {
    version: CLIPBOARD_FORMAT_VERSION,
    center: AabbNs.center(unionAabb) as [number, number],
    entities,
  }
}

function deserializeClipboardJson(
  ctx: Context,
  json: string,
): { entities: ClipboardEntityData[]; center: [number, number] } | null {
  let parsed: ClipboardJson
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }

  if (!parsed || parsed.version !== CLIPBOARD_FORMAT_VERSION) return null
  if (!Array.isArray(parsed.entities) || parsed.entities.length === 0) return null

  const { componentsByName } = getResources<EditorResources>(ctx)
  const syncedComponentId = Synced._getComponentId(ctx)
  const entities: ClipboardEntityData[] = []

  for (const entityObj of parsed.entities) {
    const entityData: ClipboardEntityData = new Map()

    for (const [componentName, data] of Object.entries(entityObj)) {
      if (componentName === SYNCED_KEY) {
        entityData.set(syncedComponentId, data)
        continue
      }
      const componentDef = componentsByName.get(componentName)
      if (componentDef && componentDef.sync === 'document') {
        entityData.set(componentDef._getComponentId(ctx), data)
      }
    }

    entities.push(entityData)
  }

  return { entities, center: parsed.center }
}

// --- Ref field helpers ---

type ComponentSchema = Record<string, { def?: { type?: string } }>

function convertRefsToUuids(
  ctx: Context,
  schema: ComponentSchema,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...data }
  for (const [fieldName, fieldBuilder] of Object.entries(schema)) {
    if (fieldBuilder?.def?.type === 'ref') {
      const entityId = data[fieldName] as EntityId | null
      result[fieldName] = entityId != null && hasComponent(ctx, entityId, Synced) ? Synced.read(ctx, entityId).id : null
    }
  }
  return result
}

function getRefFieldNames(schema: ComponentSchema): string[] {
  const refFields: string[] = []
  for (const [fieldName, fieldBuilder] of Object.entries(schema)) {
    if (fieldBuilder?.def?.type === 'ref') {
      refFields.push(fieldName)
    }
  }
  return refFields
}

function resolveRefFields(
  ctx: Context,
  entityId: EntityId,
  componentDef: { schema: ComponentSchema; write: (ctx: Context, entityId: EntityId) => Record<string, unknown> },
  componentData: Record<string, unknown>,
  uuidToEntityId: Map<string, EntityId>,
): void {
  const component = componentDef.write(ctx, entityId)
  for (const [fieldName, fieldBuilder] of Object.entries(componentDef.schema)) {
    if (fieldBuilder?.def?.type === 'ref') {
      const uuid = componentData[fieldName] as string | null | undefined
      if (uuid != null) {
        component[fieldName] = uuidToEntityId.get(uuid) ?? null
      }
    }
  }
}

// --- Paste entities ---

function pasteEntities(
  ctx: Context,
  clipboardEntities: ClipboardEntityData[],
  center: [number, number],
  position?: Vec2,
): void {
  if (clipboardEntities.length === 0) return

  const { componentsById } = getResources<EditorResources>(ctx)
  const documentComponents = new Map([...componentsById].filter(([, def]) => def.sync === 'document'))
  const syncedComponentId = Synced._getComponentId(ctx)
  const blockComponentId = Block._getComponentId(ctx)

  let offset: Vec2
  if (position) {
    offset = Vec2.clone(position)
    Vec2.sub(offset, center)
  } else {
    const screenCenter = Camera.getWorldCenter(ctx)
    offset = Vec2.clone(screenCenter)
    Vec2.sub(offset, center)
    Grid.snapPosition(ctx, offset)
  }

  const sortedEntities = [...clipboardEntities].sort((a, b) => {
    const rankA = (a.get(blockComponentId) as { rank?: string } | undefined)?.rank ?? ''
    const rankB = (b.get(blockComponentId) as { rank?: string } | undefined)?.rank ?? ''
    return rankA < rankB ? -1 : rankA > rankB ? 1 : 0
  })

  deselectAll(ctx)

  const uuidToNewEntityId = new Map<string, EntityId>()
  const pendingRefs: Array<{
    entityId: EntityId
    componentDef: ComponentDef<any>
    componentData: Record<string, unknown>
  }> = []

  for (const entityData of sortedEntities) {
    const entityId = createEntity(ctx)

    const syncedData = entityData.get(syncedComponentId) as { id: string } | undefined
    if (syncedData?.id) {
      uuidToNewEntityId.set(syncedData.id, entityId)
    }

    addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })

    for (const [componentId, componentData] of entityData) {
      if (componentId === syncedComponentId) continue

      const componentDef = documentComponents.get(componentId)
      if (!componentDef) continue

      const data = { ...(componentData as Record<string, unknown>) }

      if (componentId === blockComponentId) {
        const pos = Vec2.clone(data.position as Vec2)
        Vec2.add(pos, offset)
        data.position = pos
        data.rank = RankBounds.genNext(ctx)
      }

      const refFields = getRefFieldNames(componentDef.schema)
      if (refFields.length > 0) {
        for (const fieldName of refFields) {
          delete data[fieldName]
        }
        pendingRefs.push({ entityId, componentDef, componentData: componentData as Record<string, unknown> })
      }

      addComponent(ctx, entityId, componentDef, data as any)
    }

    selectBlock(ctx, entityId)
  }

  for (const { entityId, componentDef, componentData } of pendingRefs) {
    resolveRefFields(ctx, entityId, componentDef, componentData, uuidToNewEntityId)
  }
}

// --- Measure HTML ---

function measureHtml(
  html: string,
  constrain: boolean,
  zoom: number,
  containerWidth: number,
): { width: number; height: number } {
  const defaults = Text.default()
  const el = document.createElement('div')
  el.style.position = 'absolute'
  el.style.visibility = 'hidden'
  el.style.fontFamily = defaults.fontFamily
  el.style.fontSize = `${defaults.fontSizePx}px`
  el.style.lineHeight = `${defaults.lineHeight}`
  el.style.letterSpacing = `${defaults.letterSpacingEm}em`

  // Match the rendered EditableText styles exactly
  el.style.width = 'fit-content'
  el.style.wordBreak = 'break-word'
  el.style.minWidth = '2px'

  if (constrain) {
    const visibleWidth = containerWidth / zoom
    const maxWidth = Math.min(MIN_WRAP_WIDTH, visibleWidth / 2)
    el.style.maxWidth = `${maxWidth}px`
    el.style.whiteSpace = 'pre-wrap'
  } else {
    el.style.whiteSpace = 'pre'
  }

  el.classList.add('wov-editable-text')
  el.innerHTML = html
  document.body.appendChild(el)
  const width = el.offsetWidth
  const height = el.offsetHeight
  document.body.removeChild(el)

  return { width, height }
}

// --- Composable ---

/**
 * Composable that handles clipboard operations (copy, cut, paste) for the canvas.
 *
 * - Copy/Cut: serializes selected blocks to the system clipboard as JSON
 * - Paste (blocks): deserializes and creates entities from clipboard data
 * - Paste (text): creates a new text block from external clipboard text
 *
 * @param containerRef - Ref to the container element to attach event listeners to
 * @param options - Optional configuration
 */
export function useClipboard(containerRef: Ref<HTMLElement | null>, options: CopyPasteOptions = {}) {
  const enabled = options.enabled ?? true
  const canPasteText = options.canPasteTextAsBlock ?? true

  if (!enabled) return

  const { getEditor, nextEditorTick } = useEditorContext()
  const textEditorController = useTextEditorController()

  let pendingPaste: { plainText: string; html: string } | null = null

  // Watch for editor creation to forward pending text paste
  watch(
    () => textEditorController.editor.value,
    (editor) => {
      if (!editor || !pendingPaste) return

      const { plainText, html } = pendingPaste
      pendingPaste = null

      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/plain', plainText)
      if (html) dataTransfer.setData('text/html', html)

      const syntheticEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      })

      editor.view.dom.dispatchEvent(syntheticEvent)

      nextEditorTick((ctx) => {
        DeselectAll.spawn(ctx)
      })
    },
  )

  function writeBlocksToClipboard(event: ClipboardEvent): boolean {
    if (textEditorController.editor.value || !event.clipboardData) return false
    const editor = getEditor()
    if (!editor) return false
    const ctx = editor._getContext()
    const data = serializeSelectedBlocks(ctx)
    if (!data) return false

    event.clipboardData.setData(BLOCK_CLIPBOARD_TYPE, JSON.stringify(data))
    event.clipboardData.setData('text/plain', `${data.entities.length} block${data.entities.length === 1 ? '' : 's'}`)
    event.preventDefault()
    return true
  }

  function handleCopy(event: ClipboardEvent) {
    writeBlocksToClipboard(event)
  }

  function handleCut(event: ClipboardEvent) {
    if (!writeBlocksToClipboard(event)) return

    nextEditorTick((ctx) => {
      for (const entityId of selectedBlocksQuery.current(ctx)) {
        removeEntity(ctx, entityId)
      }
    })
  }

  async function handlePaste(event: ClipboardEvent) {
    if (textEditorController.editor.value) return

    const active = document.activeElement
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active as HTMLElement)?.isContentEditable
    ) {
      return
    }

    // Read clipboard data synchronously before any await
    const blockJson = event.clipboardData?.getData(BLOCK_CLIPBOARD_TYPE) ?? ''
    const html = event.clipboardData?.getData('text/html') ?? ''
    const plainText = event.clipboardData?.getData('text/plain') ?? ''

    // Block paste
    if (blockJson) {
      event.preventDefault()
      const ctx = await nextEditorTick()
      const result = deserializeClipboardJson(ctx, blockJson)
      if (result) {
        pasteEntities(ctx, result.entities, result.center)
      }
      return
    }

    // Text paste
    if (!canPasteText || !plainText.trim()) return

    const ctx = await nextEditorTick()
    pendingPaste = { plainText, html }

    const mouse = Mouse.read(ctx)
    const cam = Camera.read(ctx)
    const position: [number, number] = [cam.left + mouse.position[0] / cam.zoom, cam.top + mouse.position[1] / cam.zoom]

    const contentHtml = plainTextToHtml(plainText)
    const shouldConstrain = plainText.length > PASTE_WRAP_CHAR_THRESHOLD
    const containerWidth = containerRef.value?.clientWidth ?? MIN_WRAP_WIDTH
    const measured = measureHtml(contentHtml, shouldConstrain, cam.zoom, containerWidth)

    const entityId = createBlockFromSnapshot(
      ctx,
      {
        block: {
          tag: 'text',
          size: [measured.width, measured.height],
        },
        text: {
          constrainWidth: shouldConstrain,
          fontSizePx: 24,
        },
      },
      position,
    )

    if (canBlockEdit(ctx, 'text')) {
      addComponent(ctx, entityId, EditAfterPlacing, {})
    }
    SelectBlock.spawn(ctx, { entityId, deselectOthers: true })
  }

  onMounted(() => {
    const container = containerRef.value
    if (container) {
      container.addEventListener('paste', handlePaste)
      container.addEventListener('copy', handleCopy)
      container.addEventListener('cut', handleCut)
    }
  })

  onUnmounted(() => {
    const container = containerRef.value
    if (container) {
      container.removeEventListener('paste', handlePaste)
      container.removeEventListener('copy', handleCopy)
      container.removeEventListener('cut', handleCut)
    }
  })
}
