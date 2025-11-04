import { System } from '@lastolivegames/becsy';

import * as comps from '../components/index.js';

class Deleter extends System {
  // Note the usingAll.write below, which grants write entitlements on all component types.
  private readonly entities = this.query((q) => q.current.with(comps.ToBeDeleted).usingAll.write);

  public execute(): void {
    this.entities.current.forEach((entity) => {
      entity.delete();
    });
  }
}

export default Deleter;
