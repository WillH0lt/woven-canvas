# editor-vue

A minimal Vue 3 + Vite example demonstrating [`@woven-canvas/vue`](../../packages/vue) — drop the `<WovenCanvas>` component into an app to get a working infinite canvas editor.

## Running

From the repo root:

```sh
pnpm install
pnpm --filter editor-vue dev
```

Or from this directory:

```sh
pnpm dev
```

Then open the printed local URL. Other scripts:

- `pnpm build` — type-check with `vue-tsc` and build for production
- `pnpm preview` — preview the production build

## What it shows

[`src/Editor.vue`](./src/Editor.vue) mounts the `WovenCanvas` component and configures:

- **Persistence** — the canvas state is stored locally under a `documentId`, so edits survive a reload.
- **History** — undo/redo is enabled.
- **Plugin options** — canvas controls with `maxZoom: 3`.
- **Background** — a dotted grid with custom colors and subdivisions.

The component is rendered inside [`src/App.vue`](./src/App.vue), which provides the full-viewport layout.

### Going further

`Editor.vue` also contains commented-out examples of more advanced usage, including:

- **Real-time collaboration** via the `websocket` store option (point it at a running sync server).
- **Custom block definitions** through the `editor` prop (see [`src/Shape.ts`](./src/Shape.ts)).
- **Slot overrides** for custom block rendering, the floating menu, and the toolbar.

Uncomment those sections to explore each feature.
