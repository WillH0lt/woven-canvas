import { enablePatches, produceWithPatches } from "immer";
import type { Patch } from "immer";
import { atom, reactor } from "signia";
import type { Atom, Reactor } from "signia";

enablePatches();

export class ImmerAtom<T> {
  // The second Atom type parameter is the type of the diff
  readonly atom: Atom<T, Patch[]>;

  constructor(name: string, initialValue: T) {
    this.atom = atom(name, initialValue, {
      // In order to store diffs, we need to provide the `historyLength` argument
      // to the atom constructor. Otherwise it will not allocate a history buffer.
      historyLength: 10,
    });
  }

  update(fn: (draft: T) => void) {
    const [nextValue, patches] = produceWithPatches(this.atom.value, fn);
    this.atom.set(nextValue, patches);
  }
}

type ColorState = {
  color: string;
};

export class ColorStore {
  private reactor: Reactor;

  private readonly _state = new ImmerAtom<ColorState>("ColorState._state", {
    color: "#000000",
  });

  constructor() {
    this.reactor = reactor(
      "Store.reactor",
      (lastReactedEpoch: number) => {
        // console.log("Store.reactor", this._state.atom.value);
      },
      {
        scheduleEffect: (cb) => {
          console.log("scheduleEffect", this._state.atom.value);
          // This is where we would schedule the effect to run
          cb();
        },
        // (this.cancelHistoryReactor = throttleToNextFrame(cb)),
      }
    );

    this.reactor.start();
    this.reactor.scheduler.execute();
  }

  get state() {
    return this._state.atom.value;
  }

  setColor(color: string) {
    this._state.update(() => ({
      color,
    }));

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

  getColor() {
    return this._state.atom.value.color;
  }
}
