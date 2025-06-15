import { applyPatches, enablePatches, produceWithPatches } from 'immer'
import type { Patch } from 'immer'
import { atom, reactor } from 'signia'
import type { Atom, Reactor } from 'signia'
import { Block } from './components'
import type { IStorable } from './types'

enablePatches()

export class ImmerAtom<T> {
  readonly atom: Atom<T, Patch[]>

  constructor(name: string, initialValue: T) {
    this.atom = atom(name, initialValue, {
      historyLength: 1000,
    })
  }

  update(fn: (draft: T) => void) {
    const [nextValue, patches] = produceWithPatches(this.atom.value, fn)
    this.atom.set(nextValue, patches)
  }

  undo(epoch: number) {
    if (this.atom.lastChangedEpoch < epoch) {
      console.warn(`Cannot undo for ${this.atom.name} at epoch ${epoch}, last changed at ${this.atom.lastChangedEpoch}`)
      return
    }

    const diff = this.atom.getDiffSince(epoch)

    // this.atom.update.
  }
}

export class Store {
  public readonly storables: (new () => IStorable)[] = [Block]

  private reactor: Reactor

  private readonly atomMap = new Map<string, ImmerAtom<any>>()

  private checkpoints: number[] = [0]

  // private readonly _state = new ImmerAtom<State>("State._state", {
  //   blocks: [],
  // });

  constructor() {
    this.reactor = reactor(
      'Store.reactor',
      (lastReactedEpoch: number) => {
        // console.log("Store.reactor", this._state.atom.value);
      },
      {
        scheduleEffect: (cb) => {
          // this._state.atom.value
          // This is where we would schedule the effect to run
          cb()
        },
        // (this.cancelHistoryReactor = throttleToNextFrame(cb)),
      },
    )

    this.reactor.start()
    this.reactor.scheduler.execute()
  }

  // get state() {
  //   return this._state.atom.value;
  // }

  setComponent<T>(id: string, name: string, component: T) {
    const key = `${name}.${id}`

    // console.log(`Setting component ${key}`, component)

    const atom = this.atomMap.get(key)
    if (atom) {
      atom.update((draft) => {
        Object.assign(draft, component)
      })

      // console.log(atom.atom.getDiffSince(0))
    } else {
      // If the atom does not exist, create a new one
      const newAtom = new ImmerAtom<T>(key, component)
      this.atomMap.set(key, newAtom)
    }
  }

  undo() {
    // if (this.checkpoints.length === 0) {
    //   console.warn('No checkpoints to undo')
    //   return
    // }

    // const lastCheckpoint = this.checkpoints.pop()
    const lastCheckpoint = 1

    for (const [key, atom] of this.atomMap.entries()) {
      atom.undo(lastCheckpoint)

      const diff = atom.atom.getDiffSince(lastCheckpoint || 0)

      // console.log(`Undoing changes for ${key}`, diff)

      atom.update((draft) => {
        if (Array.isArray(diff)) {
          for (const patches of diff) {
            applyPatches(draft, patches)
          }
        } else {
          // If the diff is not an array, it means there are no changes
          console.warn(`No changes to undo for ${key}`)
          return
        }
      })

      // undo

      // console.log(`Applied patches for ${key}`, atom.atom.value)

      // If there are no changes, skip
      // if (diff.length === 0) {
      //   continue
      // }
      // Apply the patches to revert the state
      // applyPatches(atom.atom.value, diff)
      // atom.atom.applyPatches(diff)
      // console.log(`Applied patches for ${key}`, diff)

      // if (diff.length > 0) {
      //   // Apply the patches to revert the state
      //   atom.atom.applyPatches(diff)
      // }
    }
  }

  setColor(color: string) {
    // this._state.update(() => ({
    //   color,
    // }));
    // listen(onHistory: StoreListener<R>, filters?: Partial<StoreListenerFilters>) {
    // 	// flush history so that this listener's history starts from exactly now
    // 	this._flushHistory()
    // 	const listener = {
    // 		onHistory,
    // 		filters: {
    // 			source: filters?.source ?? 'all',
    // 			scope: filters?.scope ?? 'all',
    // 		},
    // 	}
    // 	if (!this.historyReactor.scheduler.isActivelyListening) {
    // 		this.historyReactor.start()
    // 		this.historyReactor.scheduler.execute()
    // 	}
    // 	this.listeners.add(listener)
    // 	return () => {
    // 		this.listeners.delete(listener)
    // 		if (this.listeners.size === 0) {
    // 			this.historyReactor.stop()
    // 		}
    // 	}
    // }
    // listen(): void {
    //   scheduleEffect: (cb) =>
    //     (this.cancelHistoryReactor = throttleToNextFrame(cb));
    // }
  }

  // getColor() {
  //   return this._state.atom.value.color;
  // }
}

// function compressPatches(patches: Patch[]): Patch[] {
//   produce(state0, function(draft){
//     applyPatches(draft, patches);
//   }, function(p){patches=p});

//   return patches;
// }

// export const store = new Store()
