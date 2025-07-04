import { BaseSystem, type Diff, type Resources, comps } from '@infinitecanvas/core'
import { applyDiff } from '@infinitecanvas/core/helpers'
import { type Socket, io } from 'socket.io-client'

export class PreUpdateSync extends BaseSystem {
  private socket: Socket | null = null

  protected declare readonly resources: Resources

  private readonly entities = this.query((q) => q.current.with(comps.Persistent).usingAll.write)

  private diffBuffer: Diff[] = []

  public lastFrame = 0

  public initialize(): void {
    this.socket = io('http://localhost:8087', {
      transports: ['websocket'],
    })

    this.socket.on('diff', (diff: Diff) => {
      this.diffBuffer.push(diff)
    })

    // this.socket.on('join', (data: number) => {
    //   console.log('join', data)
    // })

    // this.socket.on('leave', (data: number) => {
    //   console.log('leave', data)
    // })
  }

  public execute(): void {
    for (let i = 0; i < this.diffBuffer.length; i++) {
      const diff = this.diffBuffer[i]
      applyDiff(this, diff, this.entities)
      this.resources.history.applyDiff(diff)
    }

    this.diffBuffer.length = 0

    if (!this.resources.history.frameDiff.isEmpty) {
      this.socket?.emit('diff', this.resources.history.frameDiff)
    }
  }
}
