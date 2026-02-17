# @woven-canvas/plugin-pen

Draw smooth SVG ink strokes with pressure sensitivity.

## Installation

```bash
npm install @woven-canvas/core @woven-canvas/plugin-pen
```

## Usage

```typescript
import { Editor } from '@woven-canvas/core';
import { PenPlugin } from '@woven-canvas/plugin-pen';

const editor = new Editor(domElement, {
  plugins: [
    ...
    PenPlugin,
  ],
});
```

## API

### Components

- `PenStroke` - Pen stroke entity component
- `PenState` - Singleton for current pen state

### Commands

- `StartPenStroke` - Begin a new pen stroke
- `AddPenStrokePoint` - Add a point to the current stroke
- `CompletePenStroke` - Finish the current stroke
- `RemovePenStroke` - Delete a pen stroke

## License

MIT
