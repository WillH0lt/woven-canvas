/**
 * A min-heap priority queue implementation for Dijkstra's algorithm.
 * Supports efficient decrease-key operations.
 */
export class MinHeap {
  private heap: Array<{ id: number; distance: number }> = [];
  private positions: Map<number, number> = new Map();

  private parent(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private leftChild(i: number): number {
    return 2 * i + 1;
  }

  private rightChild(i: number): number {
    return 2 * i + 2;
  }

  private swap(i: number, j: number): void {
    this.positions.set(this.heap[i].id, j);
    this.positions.set(this.heap[j].id, i);
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private bubbleUp(i: number): void {
    while (i > 0 && this.heap[this.parent(i)].distance > this.heap[i].distance) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  private bubbleDown(i: number): void {
    let minIndex = i;

    const left = this.leftChild(i);
    if (
      left < this.heap.length &&
      this.heap[left].distance < this.heap[minIndex].distance
    ) {
      minIndex = left;
    }

    const right = this.rightChild(i);
    if (
      right < this.heap.length &&
      this.heap[right].distance < this.heap[minIndex].distance
    ) {
      minIndex = right;
    }

    if (i !== minIndex) {
      this.swap(i, minIndex);
      this.bubbleDown(minIndex);
    }
  }

  insert(id: number, distance: number): void {
    this.heap.push({ id, distance });
    const index = this.heap.length - 1;
    this.positions.set(id, index);
    this.bubbleUp(index);
  }

  extractMin(): { id: number; distance: number } | null {
    if (this.heap.length === 0) return null;

    const min = this.heap[0];
    const last = this.heap.pop()!;

    this.positions.delete(min.id);

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.positions.set(last.id, 0);
      this.bubbleDown(0);
    }

    return min;
  }

  decreaseKey(id: number, newDistance: number): void {
    const index = this.positions.get(id);
    if (index === undefined) return;

    this.heap[index].distance = newDistance;
    this.bubbleUp(index);
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  contains(id: number): boolean {
    return this.positions.has(id);
  }
}
