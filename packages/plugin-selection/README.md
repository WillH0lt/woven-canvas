# @woven-canvas/plugin-selection

Select, move, resize, and rotate objects on the infinite canvas.

## Installation

```bash
npm install @woven-canvas/core @woven-canvas/plugin-selection
```

## Usage

```typescript
import { Editor } from '@woven-canvas/core';
import { SelectionPlugin } from '@woven-canvas/plugin-selection';

const editor = new Editor(domElement, {
  plugins: [
    ...
    SelectionPlugin({
      edgeScrolling: {
        enabled: true,              // Enable edge scrolling (default: true)
        edgeSizePx: 10,             // Edge zone size in pixels (default: 10)
        edgeScrollSpeedPxPerFrame: 15, // Scroll speed per frame (default: 15)
        edgeScrollDelayMs: 250,     // Delay before scrolling starts (default: 250)
      },
    }),
  ],
});
```

## Documentation

For full API documentation, see the [documentation site](https://wovencanvas.dev).

## License

MIT
