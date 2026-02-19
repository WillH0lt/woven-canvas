# @woven-canvas/plugin-arrows

Draw and edit elbow arrows on the infinite canvas.

## Installation

```bash
npm install @woven-canvas/core @woven-canvas/plugin-arrows
```

## Usage

```typescript
import { Editor } from "@woven-canvas/core";
import { ArrowsPlugin } from "@woven-canvas/plugin-arrows";

const editor = new Editor(domElement, {
  plugins: [
    ...ArrowsPlugin({
      elbowArrowPadding: 50, // Padding around blocks when routing elbow arrows (default: 50)
    }),
  ],
});
```

## Documentation

For full API documentation, see the [documentation site](https://wovencanvas.dev).

## License

MIT
