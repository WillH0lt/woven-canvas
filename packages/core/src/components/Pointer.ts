import { Type, component, field } from '@lastolivegames/becsy'
import { PointerButton, type PointerEvent, PointerType } from '../types'
import type { Keyboard } from './Keyboard'

const PREV_COUNT = 6

@component
export class Pointer {
  @field.uint16 public declare id: number
  @field.float32.vector(2) public declare downPosition: [number, number]
  @field.float32.vector(2) public declare downWorldPosition: [number, number]
  @field.uint32 public declare downFrame: number
  @field.boolean public declare obscured: boolean
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

    // push to ring buffer
    this._prevPositionsCount++
    const writeIndex = this._prevPositionsCount % PREV_COUNT
    this._prevPositionsVec[writeIndex * 2] = value[0]
    this._prevPositionsVec[writeIndex * 2 + 1] = value[1]
    this._prevTimesVec[writeIndex] = time

    const pointCount = Math.min(this._prevPositionsCount, PREV_COUNT)
    if (pointCount <= 1) {
      this._velocity = [0, 0]
      return
    }

    const mod = (n: number) => (n + PREV_COUNT) % PREV_COUNT

    // Exponentially time-decayed weighted least-squares fit of position over time.
    // More recent samples get higher weight; slope at "time" gives current velocity.
    const TAU = 0.04 // seconds, adjust to tune responsiveness vs smoothness
    const EPS = 1e-6

    let W = 0
    let WU = 0
    let WUU = 0
    let WX = 0
    let WY = 0
    let WU_X = 0
    let WU_Y = 0

    for (let j = 0; j < pointCount; j++) {
      const idx = mod(this._prevPositionsCount - pointCount + 1 + j)

      const t = this._prevTimesVec[idx]
      const u = t - time // center times at the current sample
      const recency = -u // >= 0

      if (recency > 5 * TAU) {
        // negligible weight, skip
        continue
      }

      const w = Math.exp(-recency / TAU)

      const x = this._prevPositionsVec[idx * 2]
      const y = this._prevPositionsVec[idx * 2 + 1]

      W += w
      WU += w * u
      WUU += w * u * u

      WX += w * x
      WY += w * y

      WU_X += w * u * x
      WU_Y += w * u * y
    }

    const denom = W * WUU - WU * WU
    if (Math.abs(denom) <= EPS) {
      // Fallback: last-segment velocity
      const iCurr = this._prevPositionsCount % PREV_COUNT
      const iPrev = mod(this._prevPositionsCount - 1)
      const dt = this._prevTimesVec[iCurr] - this._prevTimesVec[iPrev]
      if (dt > EPS) {
        const dx = this._prevPositionsVec[iCurr * 2] - this._prevPositionsVec[iPrev * 2]
        const dy = this._prevPositionsVec[iCurr * 2 + 1] - this._prevPositionsVec[iPrev * 2 + 1]
        this._velocity = [dx / dt, dy / dt]
      } else {
        this._velocity = [0, 0]
      }
      return
    }

    const vx = (W * WU_X - WU * WX) / denom
    const vy = (W * WU_Y - WU * WY) / denom

    this._velocity = [vx, vy]
  }

  public toEvent(type: PointerEvent['type'], intersects: PointerEvent['intersects'], keyboard: Keyboard): PointerEvent {
    return {
      type,
      worldPosition: [this.worldPosition[0], this.worldPosition[1]],
      clientPosition: [this.position[0], this.position[1]],
      velocity: [this.velocity[0], this.velocity[1]],
      intersects,
      obscured: this.obscured,
      shiftDown: keyboard.shiftDown,
      altDown: keyboard.altDown,
      modDown: keyboard.modDown,
    }
  }
}
