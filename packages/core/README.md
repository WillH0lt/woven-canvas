# @woven-canvas/core

Framework-agnostic infinite canvas editor library.

## Installation

```bash
npm install @woven-canvas/core
```

## Usage

```typescript
import { Editor } from '@woven-canvas/core';

const editor = new Editor(domElement);

await editor.initialize();

// Run the editor loop
function loop() {
  editor.tick();
  requestAnimationFrame(loop);
}
loop();
```

## Documentation

For full API documentation, see the [documentation site](https://wovencanvas.dev).

## License

MIT
