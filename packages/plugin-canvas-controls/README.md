# @woven-canvas/plugin-canvas-controls

Pan, zoom, and scroll controls for the infinite canvas.

## Installation

```bash
npm install @woven-canvas/core @woven-canvas/plugin-canvas-controls
```

## Usage

```typescript
import { Editor } from "@woven-canvas/core";
import { CanvasControlsPlugin } from "@woven-canvas/plugin-canvas-controls";

const editor = new Editor(domElement, {
  plugins: [
    ...CanvasControlsPlugin({
      minZoom: 0.05, // Minimum zoom level (default: 0.05 = 5%)
      maxZoom: 2.7, // Maximum zoom level (default: 2.7 = 270%)
      smoothScroll: {
        enabled: true, // Enable smooth scroll tweening (default: true)
        time: 0.12, // Time in seconds to reach target position (default: 0.12)
      },
      smoothZoom: {
        enabled: true, // Enable smooth zoom tweening (default: true)
        time: 0.12, // Time in seconds to reach target zoom level (default: 0.12)
      },
    }),
  ],
});
```

## Documentation

For full API documentation, see the [documentation site](https://wovencanvas.dev).

## License

MIT
