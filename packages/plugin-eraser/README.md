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

## Documentation

For full API documentation, see the [documentation site](https://wovencanvas.dev).

## License

MIT
