# @woven-canvas/core

Framework-agnostic infinite canvas editor library built on an Entity Component System (ECS) architecture.

## Installation

```bash
npm install @woven-canvas/core
```

## Usage

```typescript
import { Editor, CorePlugin } from '@woven-canvas/core';

const editor = new Editor({
  domElement: document.getElementById('canvas'),
  plugins: [CorePlugin],
});

await editor.initialize();
editor.start();
```

## Features

- **ECS Architecture**: High-performance entity management
- **Plugin System**: Extensible architecture for adding custom functionality
- **Command System**: Undo/redo support with command definitions
- **Input Handling**: Unified keyboard, mouse, and pointer input processing

## Documentation

For full API documentation, see the [documentation site](https://wovencanvas.dev).

## License

MIT
