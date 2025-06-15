import { System, World, component, field, system } from '@lastolivegames/becsy'

import type { ColorStore } from './store'

interface Resources {
  store: ColorStore
}

@component
class Color {
  @field.int16 declare r: number
  @field.int16 declare g: number
  @field.int16 declare b: number
}

@system
class ColorHandler extends System {
  private readonly colors = this.query((q) => q.current.with(Color).write)

  execute(): void {
    for (const colorEntity of this.colors.current) {
      const color = colorEntity.write(Color)

      // animate color in a rainbow gradient loop
      color.r = (color.r + 1) % 256
      color.g = (color.g + 2) % 256
      color.b = (color.b + 3) % 256
    }
  }
}

@system
class ColorSync extends System {
  protected readonly resources!: Resources

  private readonly colors = this.query((q) => q.changed.with(Color).trackWrites)

  execute(): void {
    for (const colorEntity of this.colors.changed) {
      const color = colorEntity.read(Color)

      const hex = `#${color.r.toString(16).padStart(2, '0')}${color.g
        .toString(16)
        .padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`

      this.resources.store.setColor(hex)
    }
  }
}

export async function createWorld(store: ColorStore): Promise<World> {
  const resources = {
    resources: {
      store,
    },
  }

  const colorGroup = System.group(ColorHandler, resources)
  const colorSyncGroup = System.group(ColorSync, resources)
  colorGroup.schedule((s) => s.before(colorSyncGroup))

  const world = await World.create({
    defs: [colorGroup, colorSyncGroup],
  })
  world.createEntity(Color)

  return world
}
