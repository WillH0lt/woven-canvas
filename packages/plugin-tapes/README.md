# @woven-canvas/plugin-tapes

Draw washi tape across the canvas with click-and-drag. Click to place a default-sized tape, or drag to stretch tape between two points.

## Installation

```bash
npm install @woven-canvas/core @woven-canvas/plugin-tapes
```

## Usage

```typescript
import { Editor } from "@woven-canvas/core";
import { TapesPlugin } from "@woven-canvas/plugin-tapes";

const editor = new Editor(domElement, {
  plugins: [TapesPlugin],
});
```

## Documentation

For full API documentation, see the [documentation site](https://woven-canvas.dev).

## License

MIT
