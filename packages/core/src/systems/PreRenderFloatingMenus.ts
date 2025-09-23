import type { Query } from '@lastolivegames/becsy'

import type { BaseComponent } from '../BaseComponent'
import { BaseSystem } from '../BaseSystem'
import { ComponentRegistry } from '../ComponentRegistry'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import * as comps from '../components'
import { clamp, computeExtents, uuidToNumber } from '../helpers'
import type { CoreResources, FloatingMenuButton } from '../types'
import type { ICFloatingMenu } from '../webComponents'
import { PreRenderStoreSync } from './PreRenderStoreSync'

const FLOATING_MENU_TAG = 'ic-floating-menu'

export class PreRenderFloatingMenus extends BaseSystem<CoreCommandArgs> {
  protected declare readonly resources: CoreResources

  private readonly currentQueries = new Map<new () => BaseComponent, Query>()

  private readonly changedQueries = new Map<new () => BaseComponent, Query>()

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  private readonly selectedBlocks = this.query(
    (q) => q.addedChangedOrRemoved.current.with(comps.Selected, comps.Aabb).with(comps.Block).trackWrites,
  )

  private readonly editedBlocks = this.query((q) => q.current.with(comps.Edited))

  private readonly floatingMenuState = this.singleton.read(comps.FloatingMenuState)

  private readonly floatingMenuStateQuery = this.query((q) => q.current.with(comps.FloatingMenuState).write)

  public constructor() {
    super()

    this.schedule((s) => s.inAnyOrderWith(PreRenderStoreSync))

    const Components = ComponentRegistry.instance.components
    for (const Comp of Components) {
      const current = this.query((q) =>
        q.current.with(comps.Block, Comp).orderBy((e) => uuidToNumber(e.read(comps.Block).id)),
      )
      this.currentQueries.set(Comp, current)

      const changedQuery = this.query((q) => q.changed.with(comps.Block, comps.Selected).and.with(Comp).trackWrites)
      this.changedQueries.set(Comp, changedQuery)
    }
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.HideFloatingMenu, this.hideFloatingMenu.bind(this))
    this.addCommandListener(CoreCommand.ShowFloatingMenu, this.showFloatingMenu.bind(this))
  }

  public execute(): void {
    if (this.cameras.changed.length > 0) {
      const element = this.resources.menuContainer.querySelector(FLOATING_MENU_TAG)
      if (element) {
        this.updateMenuPosition(element)
      }
    }

    if (this.selectedBlocks.addedChangedOrRemoved.length > 0) {
      this.createUpdateOrRemoveFloatingMenu()
    }

    // if (this.selectedBlocks.current.length > 0) {
    //   const blocks = new Map<string, string>()

    //   for (const Comp of this.changedQueries.keys()) {
    //     const query = this.changedQueries.get(Comp)!
    //     if (query.changed.length === 0) continue

    //     for (const entity of query.changed) {
    //       const block = entity.read(comps.Block)
    //       blocks.set(block.id, block.tag)
    //     }
    //   }

    //   if (blocks.size > 0) {
    //     const icFloatingMenu = this.resources.menuContainer.querySelector(FLOATING_MENU_TAG)
    //     if (icFloatingMenu) {
    //       for (const [id, tag] of blocks) {
    //         this.updateSnapshotAttribute(icFloatingMenu, id, tag)
    //       }
    //     }
    //   }
    // }

    this.executeCommands()
  }

  createUpdateOrRemoveFloatingMenu(): void {
    const mySelectedBlocks = this.selectedBlocks.current.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    )

    if (mySelectedBlocks.length === 0) {
      this.removeFloatingMenu()
      return
    }

    const commonComponents = new Set<new () => BaseComponent>()
    if (mySelectedBlocks.length > 0) {
      const firstBlock = mySelectedBlocks[0].read(comps.Block)
      const firstBlockDef = this.getBlockDef(firstBlock.tag)
      if (firstBlockDef) {
        for (const Comp of firstBlockDef.components) {
          commonComponents.add(Comp)
        }
      }

      for (let i = 1; i < mySelectedBlocks.length; i++) {
        const block = mySelectedBlocks[i].read(comps.Block)
        const blockDef = this.getBlockDef(block.tag)
        if (blockDef) {
          for (const Comp of Array.from(commonComponents)) {
            if (!blockDef.components.includes(Comp)) {
              commonComponents.delete(Comp)
            }
          }
        }
      }
    }

    const buttons: FloatingMenuButton[] = []
    for (const Comp of commonComponents) {
      const floatingMenu = this.resources.floatingMenus[Comp.name]
      if (floatingMenu) {
        buttons.push(...floatingMenu.buttons)
      }
    }

    // const block = mySelectedBlocks[0].read(comps.Block)
    // const blockDefs = new Set<BlockDef>()
    // for (const blockEntity of mySelectedBlocks) {
    //   const block = blockEntity.read(comps.Block)
    //   const blockDef = this.getBlockDef(block.tag)
    //   if (blockDef) {
    //     blockDefs.add(blockDef)
    //   }
    // }

    // const buttons = []
    // for (const blockDef of blockDefs) {
    //   buttons.push(...blockDef.floatingMenu)
    // }

    // for (const component of blockDef?.components ?? []) {
    //   const floatingMenu = this.resources.floatingMenus[component.name]
    //   if (floatingMenu) {
    //     buttons.push(...floatingMenu.buttons)
    //   }
    // }

    // let tag = 'group'
    // let blockId = ''
    // let singularSelectedEntity: Entity | undefined = undefined
    // if (mySelectedBlocks.length === 1) {
    //   const block = mySelectedBlocks[0].read(comps.Block)
    //   tag = block.tag
    //   blockId = block.id
    //   singularSelectedEntity = mySelectedBlocks[0]
    // }

    // const blockDef = this.getBlockDef(tag)
    // let buttons = blockDef?.floatingMenu ?? []
    // if (singularSelectedEntity?.has(comps.Edited)) {
    //   buttons = blockDef?.editedFloatingMenu ?? []
    // }

    let element = this.resources.menuContainer.querySelector(FLOATING_MENU_TAG)
    if (!element) {
      element = document.createElement(FLOATING_MENU_TAG)
      this.updateFloatingMenuVisibility(element, this.floatingMenuState.visible)
      this.resources.menuContainer.appendChild(element)
    }

    element.buttons = buttons
    // element.blockId = block.id

    const ids = mySelectedBlocks.map((e) => e.read(comps.Block).id)
    const snapshot = this.resources.history.getEntities(ids)

    console.log(snapshot)

    element.snapshot = snapshot

    // this.updateSnapshotAttribute(element, snapshot)

    const width = element.buttons.reduce((acc, button) => acc + button.width, 0)
    const height = 40

    element.style.position = 'absolute'
    element.style.width = `${width}px`
    element.style.height = `${height}px`
    element.requestUpdate()

    this.updateMenuPosition(element)
  }

  // private updateSnapshotAttribute(element: ICFloatingMenu, blockId: string, tag: string): void {
  //   const blockDef = this.getBlockDef(tag)
  //   if (!blockDef) return

  //   const snapshotBuilder = new SnapshotBuilder()
  //   for (const Comp of blockDef.components) {
  //     const entities = this.currentQueries.get(Comp)?.current
  //     if (!entities) continue

  //     const entity = binarySearchForId(comps.Block, blockId, entities)
  //     if (!entity) continue

  //     snapshotBuilder.putComponent(blockId, Comp.name, entity.read(Comp).toJson())
  //   }

  //   element.snapshot = snapshotBuilder.snapshot
  // }

  private removeFloatingMenu(): void {
    const element = this.resources.menuContainer.querySelector(FLOATING_MENU_TAG)
    element?.remove()
  }

  private updateMenuPosition(element: ICFloatingMenu): void {
    const rect = element.getBoundingClientRect()

    const menuWidth = rect.width / this.camera.zoom
    const menuHeight = rect.height / this.camera.zoom

    const offset = 36 / this.camera.zoom
    const padding = 4 / this.camera.zoom

    const extents = computeExtents(this.selectedBlocks.current)
    const centerX = (extents.left + extents.right) / 2

    let left = this.camera.zoom * (centerX - menuWidth / 2 - this.camera.left)
    const screenWidth = this.screen.width
    left = clamp(left, padding, screenWidth - padding - menuWidth * this.camera.zoom)

    let top = this.camera.zoom * (extents.top - menuHeight - offset - this.camera.top)
    if (top < 0) {
      top = this.camera.zoom * (extents.bottom + offset - this.camera.top)
    }

    element.style.left = `${left}px`
    element.style.top = `${top}px`

    if (this.floatingMenuState.visible) {
      // hide menu if selection is off screen
      const hidden =
        this.camera.zoom * (extents.right - this.camera.left) < 0 ||
        this.camera.zoom * (extents.left - this.camera.left) > screenWidth
      this.updateFloatingMenuVisibility(element, !hidden)
    }
  }

  private hideFloatingMenu(): void {
    const floatingMenuStateEntity = this.floatingMenuStateQuery.current[0]
    const floatingMenuState = floatingMenuStateEntity.write(comps.FloatingMenuState)
    floatingMenuState.visible = false

    const element = this.resources.menuContainer.querySelector(FLOATING_MENU_TAG)
    if (element) {
      this.updateFloatingMenuVisibility(element, false)
    }
  }

  private showFloatingMenu(): void {
    const floatingMenuStateEntity = this.floatingMenuStateQuery.current[0]
    const floatingMenuState = floatingMenuStateEntity.write(comps.FloatingMenuState)
    floatingMenuState.visible = true

    const element = this.resources.menuContainer.querySelector(FLOATING_MENU_TAG)
    if (element) {
      this.updateFloatingMenuVisibility(element, true)
    }
  }

  private updateFloatingMenuVisibility(element: ICFloatingMenu, isVisible: boolean): void {
    element.style.opacity = isVisible ? '1' : '0'
    element.style.pointerEvents = isVisible ? 'auto' : 'none'

    // restart animation
    const container = element.shadowRoot?.querySelector('.container')
    if (!(container instanceof HTMLElement)) return

    container.style.animation = 'none'
    container.offsetHeight /* trigger reflow */
    container.style.animation = ''
  }
}
