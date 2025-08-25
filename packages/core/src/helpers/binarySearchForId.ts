import type { Entity } from '@lastolivegames/becsy'
import { uuidToNumber } from './uuidToNumber'

type IdComponent = {
  id: string
}

// This function performs a binary search to find a component by its ID in a sorted array of entities.
// It assumes that the entities are sorted by their IDs (via uuidToNumber()) in ascending order.
export function binarySearchForId(
  Component: new () => IdComponent,
  id: string,
  entities: readonly Entity[],
): Entity | null {
  let left = 0
  let right = entities.length - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)

    const entity = entities[mid]
    const componentId = entity.read(Component).id

    if (componentId === id) {
      return entity
    }
    if (uuidToNumber(componentId) < uuidToNumber(id)) {
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  // binary search can fail if there's a collision via uuidToNumber,
  // this won't happen often, but if it does, we can do a linear search
  for (const entity of entities) {
    if (entity.read(Component).id === id) {
      return entity
    }
  }

  return null
}
