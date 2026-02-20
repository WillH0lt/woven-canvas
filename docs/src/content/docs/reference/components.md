---
title: Components
description: Built-in Vue components reference
---

Woven Canvas exports various Vue components for building your canvas UI.

## Block Components

Pre-built block renderers you can use directly or as reference:

| Component    | Description                                     |
| ------------ | ----------------------------------------------- |
| `ShapeBlock` | Renders shape blocks (rectangle, ellipse, etc.) |
| `TextBlock`  | Renders text blocks with rich text support      |
| `ImageBlock` | Renders image blocks                            |
| `PenStroke`  | Renders freehand pen strokes                    |
| `ArcArrow`   | Renders curved arrow connectors                 |
| `ElbowArrow` | Renders right-angle arrow connectors            |
| `Eraser`     | Renders eraser cursor indicator                 |

```typescript
import {
  ShapeBlock,
  TextBlock,
  ImageBlock,
  PenStroke,
  ArcArrow,
  ElbowArrow,
} from "@woven-canvas/vue";
```

## Tool Components

Toolbar tool buttons:

| Component        | Description                  |
| ---------------- | ---------------------------- |
| `SelectTool`     | Selection and transform tool |
| `HandTool`       | Pan/drag tool                |
| `ShapeTool`      | Shape creation tool          |
| `TextTool`       | Text block creation tool     |
| `StickyNoteTool` | Sticky note creation tool    |
| `ImageTool`      | Image upload tool            |
| `PenTool`        | Freehand drawing tool        |
| `EraserTool`     | Eraser tool                  |
| `ArcArrowTool`   | Curved arrow tool            |
| `ElbowArrowTool` | Right-angle arrow tool       |

```typescript
import {
  SelectTool,
  HandTool,
  ShapeTool,
  TextTool,
  StickyNoteTool,
  ImageTool,
  PenTool,
  EraserTool,
  ArcArrowTool,
  ElbowArrowTool,
} from "@woven-canvas/vue";
```

## Toolbar Components

| Component       | Description                |
| --------------- | -------------------------- |
| `Toolbar`       | The main toolbar container |
| `ToolbarButton` | Individual toolbar button  |

### ToolbarButton Props

| Prop                | Type     | Description                      |
| ------------------- | -------- | -------------------------------- |
| `name`              | `string` | Unique tool identifier           |
| `tooltip`           | `string` | Tooltip text                     |
| `placementSnapshot` | `string` | JSON snapshot for click-to-place |
| `dragOutSnapshot`   | `string` | JSON snapshot for drag-to-create |
| `cursor`            | `string` | CSS cursor when active           |

## Menu Components

| Component         | Description                      |
| ----------------- | -------------------------------- |
| `FloatingMenu`    | Container for the floating menu  |
| `FloatingMenuBar` | Default floating menu bar layout |
| `MenuButton`      | Button styled for floating menu  |
| `MenuDropdown`    | Dropdown panel for menu options  |
| `MenuTooltip`     | Tooltip for menu buttons         |

### Menu Button Components

| Component                | Description               |
| ------------------------ | ------------------------- |
| `ColorButton`            | Color picker button       |
| `ColorPicker`            | Color picker dropdown     |
| `ShapeKindButton`        | Shape type selector       |
| `ShapeFillColorButton`   | Shape fill color picker   |
| `ShapeStrokeColorButton` | Shape stroke color picker |
| `ArrowThicknessButton`   | Arrow line thickness      |
| `ArrowHeadButton`        | Arrow head style selector |

### Text Formatting Buttons

| Component              | Description             |
| ---------------------- | ----------------------- |
| `TextBoldButton`       | Toggle bold             |
| `TextItalicButton`     | Toggle italic           |
| `TextUnderlineButton`  | Toggle underline        |
| `TextColorButton`      | Text color picker       |
| `TextAlignmentButton`  | Text alignment selector |
| `TextFontSizeButton`   | Font size selector      |
| `TextFontFamilyButton` | Font family selector    |

```typescript
import {
  TextBoldButton,
  TextItalicButton,
  TextUnderlineButton,
  TextColorButton,
  TextAlignmentButton,
  TextFontSizeButton,
  TextFontFamilyButton,
} from "@woven-canvas/vue";
```

## UI Components

| Component          | Description                   |
| ------------------ | ----------------------------- |
| `CanvasBackground` | Canvas background (grid/dots) |
| `UserPresence`     | User avatar list              |
| `LoadingOverlay`   | Loading indicator             |
| `EditableText`     | Rich text editor component    |

## Enums and Constants

```typescript
import {
  Shape, // Shape kinds (Rectangle, Ellipse, etc.)
  StrokeKind, // Stroke styles (Solid, Dashed, Dotted)
  TextAlignment, // Text alignment (Left, Center, Right, Justify)
  CursorKind, // Cursor types
  SHAPES, // Shape definitions array
  CURSORS, // Cursor definitions map
  ARROW_HEADS, // Arrow head definitions array
} from "@woven-canvas/vue";
```

### Shape Enum

```typescript
const Shape = {
  Rectangle: "rectangle",
  Ellipse: "ellipse",
  Triangle: "triangle",
  Diamond: "diamond",
  Pentagon: "pentagon",
  Hexagon: "hexagon",
  Star: "star",
  RoundedRectangle: "rounded-rectangle",
} as const;
```

### TextAlignment Enum

```typescript
const TextAlignment = {
  Left: "left",
  Center: "center",
  Right: "right",
  Justify: "justify",
} as const;
```

### StrokeKind Enum

```typescript
const StrokeKind = {
  Solid: 0,
  Dashed: 1,
  Dotted: 2,
} as const;
```
