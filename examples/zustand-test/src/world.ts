import { System, World, component, field, system } from '@lastolivegames/becsy'

import { setState } from './store'

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
      const _color = colorEntity.write(Color)

      // // animate color in a rainbow gradient loop
      // color.r = (color.r + 1) % 256;
      // color.g = (color.g + 2) % 256;
      // color.b = (color.b + 3) % 256;
    }
  }
}

@system
class ColorSync extends System {
  private readonly colors = this.query((q) => q.changed.with(Color).trackWrites)

  execute(): void {
    for (const colorEntity of this.colors.changed) {
      const color = colorEntity.read(Color)

      const hex = `#${color.r.toString(16).padStart(2, '0')}${color.g
        .toString(16)
        .padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
      setState({ color: hex })
    }
  }
}

export async function createWorld(): Promise<World> {
  const world = await World.create({
    defs: [ColorHandler, ColorSync],
  })
  world.createEntity(Color)

  return world
}
