// import { System, co } from '@lastolivegames/becsy'

// import * as comps from '../components/index'
// import type { CoreResources } from '../typesPrivate'
// import { EmitterEventKind } from '../typesPrivate'
// import type { Command } from '../typesPublic'
// import Deleter from './Deleter'

// class CommandSpawner extends System {
//   private readonly _commands = this.query((q) => q.with(comps.Command, comps.ToBeDeleted).write)

//   private readonly resources!: CoreResources

//   public constructor() {
//     super()
//     this.schedule((s) => s.after(Deleter))
//   }

//   @co private *spawnCommand(command: Command): Generator {
//     this.createEntity(comps.Command, { ...command }, comps.ToBeDeleted)
//     yield
//   }

//   public initialize(): void {
//     this.resources.emitter.on(EmitterEventKind.Command, this.spawnCommand.bind(this))
//   }
// }

// export default CommandSpawner
