import { type SystemGroup, World } from '@lastolivegames/becsy'
import type { z } from 'zod/v4'

import { Emitter } from 'strict-event-emitter'
import { CoreExtension } from './CoreExtension'
import type { Extension } from './Extension'
import { Store } from './Store'
import { EmitterEventKind, type EmitterEvents, type ICommands, Options, type Resources } from './types'

const PRIVATE_CONSTRUCTOR_KEY = Symbol()

function scheduleGroups(orderedGroups: SystemGroup[]): void {
  for (let i = 0; i < orderedGroups.length - 1; i++) {
    const currentGroup = orderedGroups[i]
    const nextGroup = orderedGroups[i + 1]

    currentGroup.schedule((s) => s.before(nextGroup))
  }
}

export class InfiniteCanvas {
  public readonly domElement: HTMLElement

  public readonly options: Options

  public readonly store: Store

  private readonly emitter: Emitter<EmitterEvents>

  private readonly world: World

  private extensions: Extension[]

  public static async New(extensions: Extension[], options: Options = {}): Promise<InfiniteCanvas> {
    const parsedOptions = Options.parse(options)

    const domElement = document.createElement('div')
    domElement.id = 'infinite-canvas'
    domElement.style.position = 'relative'
    domElement.style.width = '100%'
    domElement.style.height = '100%'
    domElement.style.overflow = 'hidden'
    domElement.tabIndex = 0

    const resources = {
      domElement,
    }

    const emitter = new Emitter<EmitterEvents>()

    const store = new Store()

    extensions.push(new CoreExtension(emitter, store))

    await Promise.all(extensions.map((ext) => ext.initialize(resources)))

    // const setupGroup = [
    //   System.group(sys.CommandSpawner, { resources: coreResources }, sys.StoreSync, { resources: coreResources }),
    // ]

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

    // postUpdateGroups.push(System.group(sys.Deleter, { resources: coreResources }))

    const orderedGroups = [
      // ...setupGroup,
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

    // const useStore = create(() => ({
    //   ...extensions
    //     .map((extension) => extension.store)
    //     .filter((store) => store !== null)
    //     .reduce((acc: Record<string, unknown>, store, idx) => {
    //       const extension = extensions[idx]
    //       acc[extension.name] = store
    //       return acc
    //     }, {}),
    //   // blocks: ["a", "b", "c"],
    // }))

    const world = await World.create({
      defs: orderedGroups,
    })

    // collect trackable components
    // comps.Block.arguments
    // comps.Block.

    // world.build((worldSys) => {
    //   for (const block of blocks) {
    //     worldSys.createEntity(comps.Block, { ...block })
    //   }
    // })

    return new InfiniteCanvas(extensions, parsedOptions, world, resources, emitter, store, PRIVATE_CONSTRUCTOR_KEY)
  }

  constructor(
    extensions: Extension[],
    options: z.infer<typeof Options>,
    world: World,
    resources: Resources,
    emitter: Emitter<EmitterEvents>,
    store: Store,
    privateConstructorKey: Symbol,
  ) {
    if (privateConstructorKey !== PRIVATE_CONSTRUCTOR_KEY) {
      throw new Error('Use InfiniteCanvas.New() to create an instance.')
    }

    this.extensions = extensions
    this.options = options
    this.world = world
    this.domElement = resources.domElement
    this.emitter = emitter
    this.store = store

    if (options.autoloop) {
      this.loop()
    }
    if (options.autofocus) {
      this.useAutoFocus()
    }
  }

  public execute(): Promise<void> {
    return this.world.execute().catch((err: unknown) => {
      console.error(err)
    })
  }

  /**
   * An object of all registered commands.
   */
  public get commands(): ICommands {
    const send = (kind: string, ...args: any[]) =>
      this.emitter.emit(EmitterEventKind.Command, {
        kind,
        payload: JSON.stringify(args),
      })

    return this.extensions.reduce((commands, ext) => {
      if (!ext.addCommands) return commands

      const extCommands = ext.addCommands.call(this, send)
      if (!extCommands) return commands

      for (const key of Object.keys(extCommands)) {
        ;(commands as any)[key] = extCommands[key as keyof typeof extCommands]
      }
      return commands
    }, {} as ICommands)
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

    // Start observing the whole document or a specific container's parent
    observer.observe(document.body, { childList: true, subtree: true })
  }
}
