# @woven-canvas/plugin-eraser

Click and drag to erase objects along the path with capsule-based collision detection.

## Installation

```bash
npm install @woven-canvas/core @woven-canvas/plugin-eraser
```

## Usage

```typescript
import { Editor } from '@woven-canvas/core';
import { EraserPlugin } from '@woven-canvas/plugin-eraser';

const editor = new Editor(domElement, {
  plugins: [
    ...
    EraserPlugin({
      tailRadius: 8,   // Eraser collision radius in world units (default: 8)
      tailLength: 20,  // Max stroke points for collision trail (default: 10, range: 1-20)
    }),
  ],
});
```

## API

### Components

- `EraserStroke` - Eraser stroke state component
- `EraserState` - Singleton for eraser configuration

### Commands

- `StartEraserStroke` - Begin erasing
- `AddEraserStrokePoint` - Add a point to the eraser path
- `CompleteEraserStroke` - Finish erasing and delete marked entities
- `CancelEraserStroke` - Cancel erasing without deleting
- `MarkAsErased` - Mark an entity for deletion

## License

MIT
