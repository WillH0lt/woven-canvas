import { Asset, addComponent, Block, createEntity, type EntityId, Grid, Image, UploadState } from '@woven-canvas/core'
import { Synced } from '@woven-ecs/canvas-store'
import { inject } from 'vue'
import { WOVEN_CANVAS_KEY } from '../injection'
import { useEditorContext } from './useEditorContext'

export interface ImageCreationOptions {
  /** Maximum size for the longest side (default: 400) */
  maxSize?: number
}

export interface UseImageCreationReturn {
  /** Get dimensions of an image file */
  getImageDimensions: (file: File) => Promise<{ width: number; height: number }>
  /** Create an image block at the specified world position */
  createImageBlock: (file: File, worldX: number, worldY: number, options?: ImageCreationOptions) => Promise<EntityId>
}

/**
 * Composable for creating image blocks on the canvas.
 * Handles dimension detection, entity creation, grid snapping, and asset upload.
 */
export function useImageCreation(): UseImageCreationReturn {
  const canvasContext = inject(WOVEN_CANVAS_KEY)
  if (!canvasContext) {
    throw new Error('useImageCreation must be used within a WovenCanvas component')
  }

  const { nextEditorTick } = useEditorContext()

  /**
   * Get dimensions of an image file.
   */
  function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(img.src)
      }
      img.onerror = () => {
        reject(new Error('Failed to load image'))
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Create an image block at the specified world position.
   */
  async function createImageBlock(
    file: File,
    worldX: number,
    worldY: number,
    options: ImageCreationOptions = {},
  ): Promise<EntityId> {
    const { maxSize = 400 } = options

    const dimensions = await getImageDimensions(file)
    const ctx = await nextEditorTick()

    // Scale image to reasonable size
    const scale = Math.min(1, maxSize / Math.max(dimensions.width, dimensions.height))
    let width = Math.round(dimensions.width * scale)
    let height = Math.round(dimensions.height * scale)

    // Snap size to grid if enabled
    const grid = Grid.read(ctx)
    if (grid.enabled) {
      width = Math.max(grid.colWidth, Math.round(width / grid.colWidth) * grid.colWidth)
      height = Math.max(grid.rowHeight, Math.round(height / grid.rowHeight) * grid.rowHeight)
    }

    // Create entity
    const entityId = createEntity(ctx)

    // Add Block component
    addComponent(ctx, entityId, Block)
    const block = Block.write(ctx, entityId)
    block.tag = 'image'
    block.position[0] = worldX - width / 2
    block.position[1] = worldY - height / 2
    block.size[0] = width
    block.size[1] = height

    // Snap position to grid if enabled
    Grid.snapPosition(ctx, block.position)

    // Generate identifier upfront
    const identifier = crypto.randomUUID()

    // Add Asset component
    addComponent(ctx, entityId, Asset)
    const asset = Asset.write(ctx, entityId)
    asset.identifier = identifier
    asset.uploadState = UploadState.Pending

    // Add Image component
    addComponent(ctx, entityId, Image)
    const image = Image.write(ctx, entityId)
    image.width = dimensions.width
    image.height = dimensions.height
    image.alt = file.name

    // Add Synced component
    addComponent(ctx, entityId, Synced, {
      id: crypto.randomUUID(),
    })

    // Upload if asset manager is available
    const assetManager = canvasContext?.getAssetManager()
    if (assetManager) {
      uploadImage(entityId, identifier, file)
    }

    return entityId
  }

  /**
   * Upload the image file (runs in background, updates asset state).
   */
  async function uploadImage(entityId: EntityId, identifier: string, file: File) {
    const assetManager = canvasContext?.getAssetManager()
    if (!assetManager) return

    try {
      await assetManager.upload(identifier, file, {
        filename: file.name,
        mimeType: file.type,
      })
      const ctx = await nextEditorTick()
      const asset = Asset.write(ctx, entityId)
      asset.uploadState = UploadState.Complete
    } catch {
      const ctx = await nextEditorTick()
      const asset = Asset.write(ctx, entityId)
      asset.uploadState = UploadState.Failed
    }
  }

  return {
    getImageDimensions,
    createImageBlock,
  }
}
