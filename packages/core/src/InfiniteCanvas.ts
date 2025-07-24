import { type SystemGroup, World } from '@lastolivegames/becsy'
import type { z } from 'zod/v4'

import { Emitter } from 'strict-event-emitter'
import type { BaseExtension } from './BaseExtension'
import { CoreExtension } from './CoreExtension'
import { History } from './History'
import { State } from './State'
import { type BaseResources, EmitterEventKind, type EmitterEvents, type ICommands, type IStore, Options } from './types'

function scheduleGroups(orderedGroups: SystemGroup[]): void {
  for (let i = 0; i < orderedGroups.length - 1; i++) {
    const currentGroup = orderedGroups[i]
    const nextGroup = orderedGroups[i + 1]

    currentGroup.schedule((s) => s.before(nextGroup))
  }
}

export class InfiniteCanvas {
  public static instance: InfiniteCanvas | null = null

  public readonly domElement: HTMLElement

  public store: IStore = {} as IStore

  public commands: ICommands = {} as ICommands

  // private readonly state: State

  // private readonly emitter: Emitter<EmitterEvents>

  // private readonly world: World

  // private extensions: Extension[]

  public static async New(extensions: BaseExtension[], options: z.input<typeof Options> = {}): Promise<InfiniteCanvas> {
    const parsedOptions = Options.parse(options)

    const domElement = document.createElement('div')
    domElement.id = 'infinite-canvas'
    domElement.style.width = '100%'
    domElement.style.height = '100%'
    domElement.style.overflow = 'hidden'
    domElement.tabIndex = 0

    const resources = {
      domElement,
      uid: crypto.randomUUID(),
      history: new History(),
    }

    const emitter = new Emitter<EmitterEvents>()

    const state = new State()

    extensions.push(new CoreExtension(emitter, state))

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
      defs: orderedGroups,
      maxEntities: 100_000,
      maxLimboComponents: 100_000,
    })

    world.build((system) => {
      extensions.map((ext) => ext.build(system))
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

      const extCommands = ext.addCommands(send)
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
