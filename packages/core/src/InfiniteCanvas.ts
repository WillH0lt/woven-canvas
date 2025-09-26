import { type SystemGroup, World } from '@lastolivegames/becsy'
import type { z } from 'zod/v4'

import { Emitter } from 'strict-event-emitter'
import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import { CoreExtension } from './CoreExtension'
import { History } from './History'
import { State } from './State'
import { TextEditorExtension } from './TextEditorExtension'
import { Background, Grid } from './components'
import {
  type BaseResources,
  BlockDef,
  EmitterEventKind,
  type EmitterEvents,
  FloatingMenuDef,
  type ICommands,
  type IStore,
  Options,
  type Theme,
  ToolDef,
} from './types'

import './webComponents'

function scheduleGroups(orderedGroups: SystemGroup[]): void {
  for (let i = 0; i < orderedGroups.length - 1; i++) {
    const currentGroup = orderedGroups[i]
    const nextGroup = orderedGroups[i + 1]

    currentGroup.schedule((s) => s.before(nextGroup))
    // nextGroup.schedule((s) => s.after(currentGroup))
  }
}

function addToolbar(domElement: HTMLElement, tools: Record<string, ToolDef>): void {
  const toolbarContainer = document.createElement('div')
  toolbarContainer.style.position = 'absolute'
  toolbarContainer.style.bottom = '16px'
  toolbarContainer.style.left = '0'
  toolbarContainer.style.right = '0'
  toolbarContainer.style.height = '50px'
  toolbarContainer.style.display = 'flex'
  toolbarContainer.style.justifyContent = 'center'
  // toolbarContainer.style.pointerEvents = 'none'
  domElement.appendChild(toolbarContainer)

  const toolbarElement = document.createElement('ic-toolbar')
  toolbarElement.style.maxWidth = '100%'
  toolbarElement.style.height = '100%'
  toolbarElement.tools = Object.values(tools)
  // toolbarContainer.style.pointerEvents = 'auto'
  toolbarContainer.appendChild(toolbarElement)
}

function applyTheme(theme: Theme): void {
  const style = document.documentElement.style
  style.setProperty('--ic-gray-100', theme.gray100)
  style.setProperty('--ic-gray-200', theme.gray200)
  style.setProperty('--ic-gray-300', theme.gray300)
  style.setProperty('--ic-gray-400', theme.gray400)
  style.setProperty('--ic-gray-500', theme.gray500)
  style.setProperty('--ic-gray-600', theme.gray600)
  style.setProperty('--ic-gray-700', theme.gray700)
  style.setProperty('--ic-primary-light', theme.primaryLight)
  style.setProperty('--ic-primary', theme.primary)
  style.setProperty('--ic-menu-border-radius', theme.menuBorderRadius)
  style.setProperty('--ic-menu-tooltip-border-radius', theme.menuTooltipBorderRadius)
  style.setProperty('--ic-transition-duration', theme.transitionDuration)
  style.setProperty('--ic-transition-timing-function', theme.transitionTimingFunction)
  style.setProperty('--ic-highlighted-block-outline-color', theme.highlightedBlockOutlineColor)
  style.setProperty('--ic-highlighted-block-outline-width', theme.highlightedBlockOutlineWidth)
  style.setProperty('--ic-highlighted-block-outline-offset', theme.highlightedBlockOutlineOffset)
  style.setProperty('--ic-highlighted-block-border-radius', theme.highlightedBlockBorderRadius)

  style.setProperty('--ic-zoom', '1')
}

export class InfiniteCanvas {
  public static instance: InfiniteCanvas | null = null

  public readonly domElement: HTMLElement

  public store: IStore = {} as IStore

  public commands: ICommands = {} as ICommands

  public static async New(options: z.input<typeof Options> = {}): Promise<InfiniteCanvas> {
    const parsedOptions = Options.parse(options)

    const extensions = parsedOptions.extensions.map((ext) => {
      if (ext instanceof BaseExtension) {
        return ext
      }
      if (typeof ext === 'function') {
        return ext({})
      }

      throw new Error(`Invalid extension: ${ext}`)
    })

    for (const ext of extensions) {
      ext.checkDependencies(extensions)
    }

    // create the main container element
    const domElement = document.createElement('div')
    domElement.id = 'infinite-canvas'
    domElement.style.width = '100%'
    domElement.style.height = '100%'
    domElement.style.overflow = 'hidden'
    domElement.style.touchAction = 'none'
    domElement.tabIndex = 0

    // create the background canvas if needed
    const backgroundCanvas = document.createElement('canvas')
    backgroundCanvas.id = 'background-canvas'
    backgroundCanvas.width = window.innerWidth
    backgroundCanvas.height = window.innerHeight
    backgroundCanvas.style.position = 'absolute'
    backgroundCanvas.style.top = '0'
    backgroundCanvas.style.left = '0'
    backgroundCanvas.style.width = '100%'
    backgroundCanvas.style.height = '100%'
    backgroundCanvas.style.pointerEvents = 'none'
    backgroundCanvas.style.userSelect = 'none'
    backgroundCanvas.style.zIndex = '-1'

    domElement.appendChild(backgroundCanvas)

    // create the block container which acts as the camera viewport and holds all blocks
    const blockContainer = document.createElement('div')
    blockContainer.id = 'block-container'
    blockContainer.style.pointerEvents = 'none'
    blockContainer.style.userSelect = 'none'
    blockContainer.style.transformOrigin = '0 0'
    // establish a stacking context
    blockContainer.style.transform = 'translate(0, 0) scale(1)'
    blockContainer.style.position = 'relative'
    domElement.appendChild(blockContainer)

    const emitter = new Emitter<EmitterEvents>()
    const state = new State()
    extensions.unshift(new TextEditorExtension())
    extensions.unshift(new CoreExtension(emitter, state, options))

    // Register block definitions from extensions and options
    const blockDefs: Record<string, BlockDef> = {}
    for (const ext of extensions) {
      for (const blockDef of ext.blocks) {
        blockDefs[blockDef.tag] = BlockDef.parse(blockDef)
      }
    }
    for (const blockDef of parsedOptions.customBlocks) {
      blockDefs[blockDef.tag] = blockDef
    }

    // Register components for each block definition
    for (const blockDef of Object.values(blockDefs)) {
      for (const component of blockDef.components) {
        ComponentRegistry.instance.registerComponent(component)
      }
    }

    // register floating menus
    const floatingMenus: Record<string, FloatingMenuDef> = {}
    for (const ext of extensions) {
      for (const floatingMenu of ext.floatingMenus) {
        floatingMenus[floatingMenu.component.name] = FloatingMenuDef.parse(floatingMenu)
      }
    }

    // register tool definitions
    const tools: Record<string, ToolDef> = {}
    for (const ext of extensions) {
      for (const toolDef of ext.tools) {
        tools[toolDef.name] = ToolDef.parse(toolDef)
      }
    }
    for (const tool of parsedOptions.customTools) {
      tools[tool.name] = ToolDef.parse(tool)
    }

    addToolbar(domElement, tools)

    applyTheme(parsedOptions.theme)

    const resources = {
      domElement,
      blockContainer,
      backgroundCanvas,
      blockDefs,
      floatingMenus,
      tools,
      tags: parsedOptions.customTags,
      uid: crypto.randomUUID(),
      history: new History(),
    }

    await Promise.all(extensions.map((ext) => ext.preBuild(resources)))

    const preInputGroups = extensions.map((ext) => ext.preInputGroup).filter((g) => g !== null)
    const inputGroup = extensions.map((ext) => ext.inputGroup).filter((g) => g !== null)
    const postInputGroups = extensions.map((ext) => ext.postInputGroup).filter((g) => g !== null)

    const preCaptureGroups = extensions.map((ext) => ext.preCaptureGroup).filter((g) => g !== null)
    const captureGroups = extensions.map((ext) => ext.captureGroup).filter((g) => g !== null)
    const postCaptureGroups = extensions.map((ext) => ext.postCaptureGroup).filter((g) => g !== null)

    const preUpdateGroups = extensions.map((ext) => ext.preUpdateGroup).filter((g) => g !== null)
    const updateGroups = extensions.map((ext) => ext.updateGroup).filter((g) => g !== null)
    const postUpdateGroups = extensions.map((ext) => ext.postUpdateGroup).filter((g) => g !== null)

    const preRenderGroups = extensions.map((ext) => ext.preRenderGroup).filter((g) => g !== null)
    const renderGroups = extensions.map((ext) => ext.renderGroup).filter((g) => g !== null)
    const postRenderGroups = extensions.map((ext) => ext.postRenderGroup).filter((g) => g !== null)

    const orderedGroups = [
      ...preInputGroups,
      ...inputGroup,
      ...postInputGroups,

      ...preCaptureGroups,
      ...captureGroups,
      ...postCaptureGroups,

      ...preUpdateGroups,
      ...updateGroups,
      ...postUpdateGroups,

      ...preRenderGroups,
      ...renderGroups,
      ...postRenderGroups,
    ]

    scheduleGroups(orderedGroups)

    const world = await World.create({
      defs: [...orderedGroups, ...ComponentRegistry.instance.components],
      maxEntities: 100_000,
      maxLimboComponents: 100_000,
    })

    world.build((worldSys) => {
      Object.assign(worldSys.singleton.write(Grid), parsedOptions.grid ?? {})
      Object.assign(worldSys.singleton.write(Background), parsedOptions.background ?? {})

      extensions.map((ext) => ext.build(worldSys, resources))
    })

    const infiniteCanvas = new InfiniteCanvas(extensions, world, emitter, state, resources, parsedOptions)
    InfiniteCanvas.instance = infiniteCanvas

    return infiniteCanvas
  }

  private constructor(
    private readonly extensions: BaseExtension[],
    private readonly world: World,
    private readonly emitter: Emitter<EmitterEvents>,
    private readonly state: State,
    resources: BaseResources,
    options: z.infer<typeof Options>,
  ) {
    this.domElement = resources.domElement

    if (options.autoloop) {
      this.loop()
    }
    if (options.autofocus) {
      this.useAutoFocus()
    }

    this.store = extensions.reduce((stores, ext) => {
      if (!ext.addStore) return stores

      const extStores = ext.addStore(this.state)
      if (!extStores) return stores

      for (const key of Object.keys(extStores)) {
        ;(stores as any)[key] = extStores[key as keyof typeof extStores]
      }
      return stores
    }, {} as IStore)

    const send = (kind: string, ...args: any[]) =>
      this.emitter.emit(EmitterEventKind.Command, {
        kind,
        payload: JSON.stringify(args),
      })

    this.commands = extensions.reduce((commands, ext) => {
      if (!ext.addCommands) return commands

      const extCommands = ext.addCommands(this.state, send)
      if (!extCommands) return commands

      for (const key of Object.keys(extCommands)) {
        ;(commands as any)[key] = extCommands[key as keyof typeof extCommands]
      }
      return commands
    }, {} as ICommands)
  }

  public execute(): Promise<void> {
    return this.world.execute().catch((err: unknown) => {
      console.error(err)
    })
  }

  public async destroy(): Promise<void> {
    await Promise.all(this.extensions.map((ext) => ext.destroy()))
    await this.world.terminate()
    InfiniteCanvas.instance = null
  }

  private loop(): void {
    if (!(this.world?.alive ?? true)) return

    requestAnimationFrame(() => {
      this.loop()
    })

    this.world.execute().catch((err: unknown) => {
      console.error(err)
    })
  }

  private useAutoFocus(): void {
    // call focus on the domElement once it's added to the document
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node === this.domElement) {
            // Stop observing once it's added
            observer.disconnect()
            // Wait a tick to ensure layout is ready
            requestAnimationFrame(() => {
              this.domElement.focus()
            })
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  }
}
