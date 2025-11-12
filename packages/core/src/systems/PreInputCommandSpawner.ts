import { co } from "@lastolivegames/becsy";

import { BaseSystem } from "../BaseSystem";
import * as comps from "../components/index";
import {
  type Command,
  type CoreResources,
  InwardEmitterEventKind,
} from "../types";
import { PreInputFrameCounter } from "./PreInputFrameCounter";

export class PreInputCommandSpawner extends BaseSystem<
  Record<string, Array<unknown>>
> {
  private readonly _commands = this.query(
    (q) => q.current.with(comps.Command).write
  );

  protected declare readonly resources: CoreResources;

  public constructor() {
    super();
    this.schedule((s) => s.inAnyOrderWith(PreInputFrameCounter));
  }

  @co private *spawnCommand(command: Command): Generator {
    const args = JSON.parse(command.payload);
    this.emitCommand(command.kind, ...args);
    yield;
  }

  public initialize(): void {
    this.resources.inwardEmitter.on(
      InwardEmitterEventKind.Command,
      this.spawnCommand.bind(this)
    );
  }

  public execute(): void {
    // commands only exist for 1 frame
    for (const commandEntity of this._commands.current) {
      const command = commandEntity.read(comps.Command);
      for (const ref of command.refs) {
        ref.delete();
      }

      commandEntity.delete();
    }
  }
}
