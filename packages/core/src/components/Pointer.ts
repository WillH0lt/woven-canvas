import { Type, component, field } from '@lastolivegames/becsy'
import { PointerButton, PointerType } from '../types'

const PREV_COUNT = 6

@component
export class Pointer {
  @field.uint16 public declare id: number
  @field.float32.vector(2) public declare downPosition: [number, number]
  @field.float32.vector(2) public declare downWorldPosition: [number, number]
  @field.uint32 public declare downFrame: number
  @field.float32.vector(2) public declare _position: [number, number]
  @field.float32.vector(2) public declare _velocity: [number, number]
  @field.float32.vector(2) public declare worldPosition: [number, number]
  @field.float32.vector(2 * PREV_COUNT) public declare _prevPositionsVec: number[]
  @field.float32.vector(PREV_COUNT) public declare _prevTimesVec: number[]
  @field.int32 public declare _prevPositionsCount: number

  @field({ type: Type.staticString(Object.values(PointerType)) })
  public declare pointerType: PointerType
  @field({ type: Type.staticString(Object.values(PointerButton)) })
  public declare button: PointerButton

  get position(): [number, number] {
    return this._position
  }

  get velocity(): [number, number] {
    return this._velocity
  }

  public addPositionSample(value: [number, number], time: number): void {
    const mostRecentTime = this._prevTimesVec[this._prevPositionsCount % PREV_COUNT]

    if (Math.abs(mostRecentTime - time) < 0.001) return

    this._position = value

    // update previous positions (which includes the current position)
    this._prevPositionsCount++
    const index = this._prevPositionsCount % PREV_COUNT
    this._prevPositionsVec[index * 2] = value[0]
    this._prevPositionsVec[index * 2 + 1] = value[1]
    this._prevTimesVec[index] = time

    // update the velocity
    const v: [number, number] = [0, 0]
    const segmentCount = Math.min(this._prevPositionsCount, PREV_COUNT) - 1

    if (segmentCount <= 0) {
      this._velocity = v
      return
    }

    const mod = (n: number) => (n + PREV_COUNT) % PREV_COUNT

    for (let i = 1; i <= segmentCount; i++) {
      const currentIndex = mod(this._prevPositionsCount - segmentCount + i)
      const prevIndex = mod(this._prevPositionsCount - segmentCount + i - 1)

      const dx = this._prevPositionsVec[currentIndex * 2] - this._prevPositionsVec[prevIndex * 2]
      const dy = this._prevPositionsVec[currentIndex * 2 + 1] - this._prevPositionsVec[prevIndex * 2 + 1]
      const dt = this._prevTimesVec[currentIndex] - this._prevTimesVec[prevIndex]

      v[0] += dx / dt
      v[1] += dy / dt
    }

    v[0] /= segmentCount
    v[1] /= segmentCount

    this._velocity = v
  }
}
