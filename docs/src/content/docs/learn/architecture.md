---
title: Architecture
description: Understanding the ECS architecture of Woven Canvas
---

Woven Canvas is built with an **Entity Component System (ECS)** framework called [woven-ecs](https://github.com/willwillems/woven-ecs). ECS architecture separates data from behavior, enabling high-performance updates and clean plugin composition.

## Why ECS?

Traditional object-oriented architectures couple data and behavior together in class hierarchies. ECS takes a different approach:

- **Entities** are just numeric IDs (like `42` or `1337`) — they have no data or behavior themselves
- **Components** are pure data containers attached to entities (like `Block`, `Position`, `Color`)
- **Systems** are functions that operate on entities with specific component combinations

This separation provides several benefits for a canvas editor:

| Benefit         | Description                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| **Performance** | Systems can efficiently batch-process thousands of entities with cache-friendly data access |
| **Composition** | Plugins add new components and systems without modifying existing code                      |
| **Reactivity**  | Fine-grained change tracking enables efficient Vue reactivity integration                   |
| **Networking**  | Component changes are easily serialized for real-time collaboration                         |
| **Undo/Redo**   | Automatic change tracking makes history management trivial                                  |

For a deep dive into the ECS implementation, see the [woven-ecs documentation](https://github.com/willwillems/woven-ecs).

## Blocks as Component Composition

In Woven Canvas, visual elements on the canvas are called **blocks**. Each block is an entity with multiple components attached. This composition approach means you can mix and match components to create different block types.

For example, a **sticky note** block combines five components:

```
Sticky Note Entity
├── Block         → position, size, rotation, z-order
├── Synced        → id for persistence/sync
├── Color         → background color (RGBA)
├── Text          → content, fontSize, fontFamily
└── VerticalAlign → vertical text alignment
```

The `Block` component provides spatial data that all blocks share:

```typescript
Block: {
  tag: "sticky-note",      // element type
  position: [100, 200],    // [left, top]
  size: [200, 200],        // [width, height]
  rotateZ: 0,              // rotation in radians
  rank: "aaa",             // z-order (fractional indexing)
}
```

The `Synced` component marks entities for persistence and collaboration:

```typescript
Synced: {
  id: "a1b2c3d4-...",     // unique identifier
}
```

The `Color` component stores the background color:

```typescript
Color: {
  red: 255,
  green: 242,
  blue: 117,
  alpha: 255,
}
```

The `Text` component holds text content and styling:

```typescript
Text: {
  content: "Hello!",
  fontSizePx: 24,
  fontFamily: "Figtree",
  defaultAlignment: "center",
}
```

The `VerticalAlign` component controls vertical text positioning:

```typescript
VerticalAlign: {
  value: "center",         // "top", "center", or "bottom"
}
```

Other block types use different component combinations. A **shape block** uses `Block` + `Shape` + `VerticalAlign` + `Synced`, while an **image block** uses `Block` + `Image` + `Asset` + `Synced`. You can define new components to create entirely new block types.

## Next Steps

Learn how the [Editor](/learn/editor/) runtime manages the ECS world and coordinates updates.
