import type { System } from '@lastolivegames/becsy'
import { type ReadonlySignal, computed } from '@preact/signals-core'
import type { Emitter } from 'strict-event-emitter'

import type { BaseComponent } from './BaseComponent'
import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import type { Snapshot } from './History'
import { LocalDB } from './LocalDB'
import type { State } from './State'
import { floatingMenuButtonColor, floatingMenuButtonVerticalAlign } from './buttonCatalog'
import { CoreCommand, type CoreCommandArgs } from './commands'
import {
  Block,
  Camera,
  CameraState,
  Color,
  Connector,
  Controls,
  Edited,
  Hovered,
  Persistent,
  Selected,
  Text,
  VerticalAlign,
} from './components'
import { DEFAULT_FONT_FAMILIES, SESSION_KEY } from './constants'
import { HAND_CURSOR, SELECT_CURSOR } from './constants'
import { createSnapshot } from './helpers'
import * as sys from './systems'
import {} from './textUtils'
import type {
  AnimationInput,
  BaseResources,
  ColorMenuOptions,
  CoreResources,
  EmitterEvents,
  FontFamily,
  ICommands,
  IConfig,
  IStore,
  Options,
  SendCommandFn,
  SerializablePropNames,
} from './types'

type BlockData = Pick<Block, SerializablePropNames<Block>>
type ColorData = Pick<Color, SerializablePropNames<Color>>
type ControlsData = Pick<Controls, SerializablePropNames<Controls>>

declare module '@infinitecanvas/core' {
  interface ICommands {
    core: {
      setCamera: (camera: Partial<Camera>, animation: AnimationInput) => void
      cancelCameraAnimation: () => void
      frameCameraToBlocks: (animation: AnimationInput) => void
      undo: () => void
      redo: () => void
      createCheckpoint: () => void
      bringForwardSelected: () => void
      sendBackwardSelected: () => void
      deselectAll: () => void
      duplicateSelected: () => void
      removeSelected: () => void
      updateBlock: (blockId: string, block: Partial<BlockData>) => void
      updateFromSnapshot: (snapshot: Snapshot) => void
      addBlock: (block: Partial<BlockData>, components: BaseComponent[]) => void
      setControls: (controls: Partial<ControlsData>) => void
      setColor: (blockId: string, color: Partial<ColorData>) => void
      applyColorToSelected: (color: ColorData) => void
      applyVerticalAlignToSelected: (verticalAlign: VerticalAlign) => void
      createAndDragOntoCanvas: (snapshot: Snapshot) => void
    }
  }

  interface IStore {
    core: {
      blockCount: ReadonlySignal<number>
      selectedBlockCount: ReadonlySignal<number>
      selectedBlockIds: ReadonlySignal<string[]>
      hoveredBlockId: ReadonlySignal<string | null>
      blockById: (id: string) => ReadonlySignal<Block | undefined>
      colorById: (id: string) => ReadonlySignal<Color | undefined>
      verticalAlignById: (id: string) => ReadonlySignal<VerticalAlign | undefined>
      textById: (id: string) => ReadonlySignal<Text | undefined>
      controls: ReadonlySignal<Controls | undefined>
      camera: ReadonlySignal<Camera | undefined>
      cameraState: ReadonlySignal<CameraState | undefined>
      fontFamilies: ReadonlySignal<FontFamily[]>
      selectedColors: ReadonlySignal<Color[]>
    }
  }

  interface IConfig {
    core: {
      colorMenu: ColorMenuOptions
      defaultFontFamily: FontFamily
    }
  }
}

export class CoreExtension extends BaseExtension {
  public readonly floatingMenus = [
    {
      component: Color,
      buttons: [floatingMenuButtonColor],
      orderIndex: 10,
    },
    {
      component: VerticalAlign,
      buttons: [floatingMenuButtonVerticalAlign],
      orderIndex: 100,
    },
  ]

  public readonly tools = [
    {
      name: 'select',
      buttonTag: 'ic-select-tool',
      buttonTooltip: 'Select',
      cursorIcon: SELECT_CURSOR,

      blockContainer: 'asdf',
    },
    {
      name: 'hand',
      buttonTag: 'ic-hand-tool',
      buttonTooltip: 'Hand',
      cursorIcon: HAND_CURSOR,
    },
    {
      name: 'text',
      buttonTag: 'ic-text-tool',
      buttonTooltip: 'Text',
    },
  ]

  private readonly options: Options
  private readonly emitter: Emitter<EmitterEvents>
  private readonly state: State
  private initialEntities: Snapshot = {}

  constructor(emitter: Emitter<EmitterEvents>, state: State, options: Options) {
    super()
    this.emitter = emitter
    this.state = state
    this.options = options
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Block)
    ComponentRegistry.instance.registerComponent(Color)
    ComponentRegistry.instance.registerComponent(VerticalAlign)
    ComponentRegistry.instance.registerComponent(Edited)
    ComponentRegistry.instance.registerComponent(Selected)
    ComponentRegistry.instance.registerComponent(Hovered)
    ComponentRegistry.instance.registerComponent(Persistent)
    ComponentRegistry.instance.registerComponent(Connector)

    ComponentRegistry.instance.registerComponent(Controls)
    ComponentRegistry.instance.registerComponent(Camera)
    ComponentRegistry.instance.registerComponent(CameraState)

    const menuContainer = document.createElement('div')
    menuContainer.style.pointerEvents = 'none'
    menuContainer.style.userSelect = 'none'
    menuContainer.style.transformOrigin = '0 0'
    // establish a stacking context
    menuContainer.style.transform = 'translate(0, 0) scale(1)'
    menuContainer.style.position = 'relative'
    resources.domElement.append(menuContainer)

    const localDB = await LocalDB.New(this.options.persistenceKey)
    this.initialEntities = await localDB.getAll()

    // await loadFonts(this.initialEntities, this.options)

    const coreResources: CoreResources = {
      ...resources,
      ...this.options,
      emitter: this.emitter,
      state: this.state,
      menuContainer,
      localDB,
    }

    this.preInputGroup = this.createGroup(coreResources, sys.PreInputCommandSpawner, sys.PreInputFrameCounter)
    this.inputGroup = this.createGroup(
      coreResources,
      sys.InputScreen,
      sys.InputPointer,
      sys.InputKeyboard,
      sys.InputMouse,
    )

    this.preCaptureGroup = this.createGroup(coreResources, sys.PreCaptureIntersect, sys.PreCaptureSelect)
    this.captureGroup = this.createGroup(
      coreResources,
      sys.CaptureBlockPlacement,
      sys.CaptureTransformBox,
      sys.CaptureHoverCursor,
      sys.CaptureKeyboard,
    )
    this.preUpdateGroup = this.createGroup(coreResources, sys.PreUpdateEdited, sys.PreUpdateUndoRedo)
    this.updateGroup = this.createGroup(
      coreResources,
      sys.UpdateBlocks,
      sys.UpdateCamera,
      sys.UpdateSelection,
      sys.UpdateTransformBox,
      sys.UpdateDragHandler,
    )
    this.postUpdateGroup = this.createGroup(
      coreResources,
      sys.PostUpdateDeleter,
      sys.PostUpdateHistory,
      sys.PostUpdateSessionSync,
      sys.PostUpdateScaleWithZoom,
    )
    this.preRenderGroup = this.createGroup(coreResources, sys.PreRenderStoreSync, sys.PreRenderFloatingMenus)
    this.renderGroup = this.createGroup(coreResources, sys.RenderHtml, sys.RenderBackground)
  }

  public build(worldSystem: System, resources: BaseResources): void {
    for (const [id, entity] of Object.entries(this.initialEntities)) {
      if (id === SESSION_KEY) {
        initializeSessionSingletons(worldSystem, entity)
      } else {
        initializeBlock(worldSystem, entity, resources)
      }

      // if (id === SESSION_KEY) {
      //   // initialize session singletons
      //   const name = Object.keys(entity)[0]
      //   const Component = ComponentRegistry.instance.getSingletonByName(name)
      //   if (Component) {
      //     const comp = worldSystem.singleton.write(Component)
      //     comp.fromJson(entity[name])
      //   }

      //   continue
      // }

      // // initialize blocks
      // const args = []

      // const tag = entity.Block.tag
      // const components = resources.blockDefs[tag as string]?.components

      // if (!components) {
      //   console.warn(
      //     `Local storage tried to load a block with tag "${tag}" but no block definitions were found for it.`,
      //   )
      //   continue
      // }

      // for (const component of [Block, ...components]) {
      //   const model = entity[component.name] || {}
      //   const instance = new component().fromJson(model)
      //   args.push(component, instance)
      // }

      // // @ts-ignore
      // worldSystem.createEntity(...args, Persistent)
    }

    // clear initialEntities to save on memory
    this.initialEntities = {}
  }

  public addConfig = (): Partial<IConfig> => {
    return {
      core: {
        colorMenu: this.options.colorMenu,
        defaultFontFamily:
          this.options.defaultFont ??
          (this.options.fontMenu.families.length > 0 ? this.options.fontMenu.families[0] : DEFAULT_FONT_FAMILIES[0]),
      },
    }
  }

  public addCommands = (state: State, send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> => {
    return {
      core: {
        setCamera: (camera: Partial<Camera>, animation: AnimationInput = {}) =>
          send(CoreCommand.SetCamera, camera, animation),
        cancelCameraAnimation: () => send(CoreCommand.CancelCameraAnimation),
        frameCameraToBlocks: (animation: AnimationInput = {}) => send(CoreCommand.FrameCameraToBlocks, animation),
        undo: () => send(CoreCommand.Undo),
        redo: () => send(CoreCommand.Redo),
        createCheckpoint: () => send(CoreCommand.CreateCheckpoint),
        bringForwardSelected: () => send(CoreCommand.BringForwardSelected),
        sendBackwardSelected: () => send(CoreCommand.SendBackwardSelected),
        deselectAll: () => send(CoreCommand.DeselectAll),
        duplicateSelected: () => send(CoreCommand.DuplicateSelected),
        removeSelected: () => send(CoreCommand.RemoveSelected),
        updateFromSnapshot: (snapshot: Snapshot) => {
          send(CoreCommand.UpdateFromSnapshot, snapshot)
        },
        updateBlock: (blockId: string, block: Partial<BlockData>) => {
          send(CoreCommand.UpdateFromSnapshot, {
            [blockId]: {
              Block: block,
            },
          })
        },
        addBlock: (block: Partial<BlockData>, components: BaseComponent[]) => {
          const snapshot = createSnapshot(new Block(block), components)
          send(CoreCommand.CreateFromSnapshot, snapshot)
        },
        setControls: (controls: Partial<ControlsData>) => send(CoreCommand.SetControls, controls),
        setColor: (blockId: string, color: Partial<ColorData>) => {
          send(CoreCommand.UpdateFromSnapshot, {
            [blockId]: {
              Color: new Color(color).toJson(),
            },
          })
        },
        applyColorToSelected: (color: ColorData) => {
          const selectedIds = state.getComponents(Selected).value
          if (Object.keys(selectedIds).length === 0) return

          const snapshot: Snapshot = {}
          for (const id of Object.keys(selectedIds)) {
            snapshot[id] = {
              Color: color,
            }
          }
          send(CoreCommand.UpdateFromSnapshot, snapshot)
        },
        applyVerticalAlignToSelected: (verticalAlign: VerticalAlign) => {
          const selectedIds = state.getComponents(Selected).value
          if (Object.keys(selectedIds).length === 0) return

          const snapshot: Snapshot = {}
          for (const id of Object.keys(selectedIds)) {
            snapshot[id] = {
              VerticalAlign: verticalAlign.toJson(),
            }
          }
          send(CoreCommand.UpdateFromSnapshot, snapshot)
        },
        createAndDragOntoCanvas: (snapshot: Snapshot) => {
          send(CoreCommand.CreateAndDragOntoCanvas, snapshot)
        },
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      core: {
        blockCount: computed(() => Object.keys(state.getComponents(Persistent).value).length),
        selectedBlockCount: computed(() => Object.keys(state.getComponents(Selected).value).length),
        selectedBlockIds: computed(() => {
          const selected = state.getComponents(Selected).value
          return Object.keys(selected)
        }),
        hoveredBlockId: computed(() => {
          const hovered = state.getComponents(Hovered).value
          const ids = Object.keys(hovered)
          return ids.length > 0 ? ids[0] : null
        }),
        blockById: (id: string): ReadonlySignal<Block | undefined> =>
          computed(() => state.getComponent<Block>(Block, id).value),
        colorById: (id: string): ReadonlySignal<Color | undefined> =>
          computed(() => state.getComponent<Color>(Color, id).value),
        verticalAlignById: (id: string): ReadonlySignal<VerticalAlign | undefined> =>
          computed(() => state.getComponent<VerticalAlign>(VerticalAlign, id).value),
        controls: computed(() => state.getSingleton(Controls).value),
        camera: computed(() => state.getSingleton(Camera).value),
        cameraState: computed(() => state.getSingleton(CameraState).value),
        textById: (id: string): ReadonlySignal<Text | undefined> =>
          computed(() => state.getComponent<Text>(Text, id).value),
        fontFamilies: computed(() => {
          const texts = state.getComponents(Text).value
          const names = new Set<string>()
          for (const text of Object.values(texts)) {
            if (text.value.fontFamily) {
              names.add(text.value.fontFamily)
            }
          }

          const namesArray = Array.from(names).sort()

          const families = namesArray.map((name) => {
            return this.options.fontMenu.families.find((family) => family.name === name)
          })

          return families.filter((family): family is FontFamily => family !== undefined)
        }),
        selectedColors: computed(() => {
          const selected = state.getComponents(Selected).value
          const ids = Object.keys(selected)

          const colors: Record<string, Color> = {}

          for (const id of ids) {
            const color = state.getComponent<Color>(Color, id)
            if (color?.value) {
              const hex = color.value.toHex()
              colors[hex] = color.value
            }
          }

          return Object.values(colors).sort((a, b) => a.toHex().localeCompare(b.toHex()))
        }),
      },
    }
  }
}

function initializeSessionSingletons(worldSystem: System, entity: any) {
  const name = Object.keys(entity)[0]
  const Component = ComponentRegistry.instance.getSingletonByName(name)
  if (Component && (Component.prototype.constructor as typeof BaseComponent).persistent) {
    const comp = worldSystem.singleton.write(Component)
    comp.fromJson(entity[name])
  }
}

function initializeBlock(worldSystem: System, entity: any, resources: BaseResources) {
  const args = []

  const tag = entity.Block.tag
  const components = resources.blockDefs[tag as string]?.components

  if (!components) {
    console.warn(`Local storage tried to load a block with tag "${tag}" but no block definitions were found for it.`)
    return
  }

  for (const component of [Block, ...components]) {
    const model = entity[component.name] || {}
    const instance = new component().fromJson(model)
    args.push(component, instance)
  }

  // @ts-ignore
  worldSystem.createEntity(...args, Persistent)
}

// async function loadFonts(initialEntities: Snapshot, options: Options): Promise<void> {
//   const fontFamilies = new Set<FontFamily>()
//   for (const [_, entity] of Object.entries(initialEntities)) {
//     if (!entity.Text?.fontFamily) continue

//     const name = entity.Text.fontFamily
//     const fontFamily = options.fontMenu.families.find((f) => f.name === name)
//     if (!fontFamily) continue

//     fontFamilies.add(fontFamily)
//   }

//   await FontLoader.loadFonts(Array.from(fontFamilies))
// }
