# @woven-canvas/plugin-pen

Draw smooth SVG ink strokes with pressure sensitivity.

## Installation

```bash
npm install @woven-canvas/core @woven-canvas/plugin-pen
```

## Usage

```typescript
import { Editor } from "@woven-canvas/core";
import { PenPlugin } from "@woven-canvas/plugin-pen";

const editor = new Editor(domElement, {
  plugins: [...PenPlugin],
});
```

## Documentation

For full API documentation, see the [documentation site](https://wovencanvas.dev).

## License

MIT
