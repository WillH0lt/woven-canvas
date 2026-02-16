import { type Context, defineQuery } from '@woven-ecs/core'
import { Pointer, User } from '../../components'
import { defineEditorSystem } from '../../EditorSystem'
import { getMyUserEntityId } from '../../helpers'
import { Camera, Mouse } from '../../singletons'

const pointerQuery = defineQuery((q) => q.tracking(Pointer))

export const presenceSystem = defineEditorSystem({ phase: 'render', priority: -100 }, (ctx: Context) => {
  // Update user position based on mouse input
  if (Mouse.didMove(ctx)) {
    const mouse = Mouse.read(ctx)
    updateUserPosition(ctx, mouse.position)
    return
  }

  // for mobile we use pointer input to update user position
  const changedPointers = pointerQuery.changed(ctx)
  if (changedPointers.length === 0) return

  const pointers = pointerQuery.current(ctx)

  let mainPointerEid: number | null = null
  let lowestId = Number.MAX_SAFE_INTEGER

  for (const eid of pointers) {
    const pointer = Pointer.read(ctx, eid)
    if (pointer.pointerId < lowestId) {
      lowestId = pointer.pointerId
      mainPointerEid = eid
    }
  }

  const pointer = Pointer.read(ctx, mainPointerEid!)
  updateUserPosition(ctx, pointer.position)
})

function updateUserPosition(ctx: Context, position: [number, number]): void {
  const myUserEid = getMyUserEntityId(ctx)
  if (myUserEid === null) return

  const user = User.write(ctx, myUserEid)
  user.position = Camera.toWorld(ctx, position)
}
