import { type Context, defineQuery } from '@woven-ecs/core'
import { Pointer, User } from '../../components'
import { defineEditorSystem } from '../../EditorSystem'
import { getMyUserEntityId } from '../../helpers'
import { Camera, Mouse } from '../../singletons'

const pointerQuery = defineQuery((q) => q.tracking(Pointer))
// Tracked query on the Camera singleton. `.changed()` returns the singleton
// entity whenever any of its fields (left/top/zoom) mutates this frame — which
// covers every camera move path: wheel, keyboard pan, hand-tool drag, and
// programmatic camera moves.
const cameraChangedQuery = defineQuery((q) => q.tracking(Camera))

export const presenceSystem = defineEditorSystem({ phase: 'render', priority: -100 }, (ctx: Context) => {
  // Update user position when the screen-space cursor moved, or when the
  // camera moved (which changes the world-space projection of a stationary
  // cursor). Both cases require a presence refresh for remote observers.
  if (Mouse.didMove(ctx) || cameraChangedQuery.changed(ctx).length > 0) {
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
