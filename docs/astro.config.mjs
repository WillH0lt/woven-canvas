// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import vue from "@astrojs/vue";
import icon from "astro-icon";


// https://astro.build/config
export default defineConfig({
  vite: {
    resolve: {
      conditions: ['@woven-canvas/source'],
    },
  },
  integrations: [
    vue(),
    starlight({
      title: "Woven Canvas",
      favicon: '/favicon.png',
      logo: {
        src: './src/assets/logo.png',
      },
      expressiveCode: {
        themes: ["github-dark-default"],
        frames: false,
      },
      social: [
        {
          icon: "blueSky",
          label: "Bluesky",
          href: "https://bsky.app/profile/william.land",
        },
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/WillH0lt/woven-canvas",
        },
      ],
      sidebar: [
        {
          label: "Introduction",
          items: [
            { label: "Quick Start", slug: "quick-start" },
          ],
        },
        {
          label: "Learn",
          items: [
            { label: "The Editor", slug: "learn/editor" },
            { label: "Blocks", slug: "learn/blocks" },
            { label: "Tools", slug: "learn/tools" },
            { label: "User Interface", slug: "learn/user-interface" },
            { label: "Persistence", slug: "learn/persistence" },
            { label: "Collaboration", slug: "learn/collaboration" },
          ],
        },
        {
          label: "Plugins",
          items: [
            { label: "Overview", slug: "plugins" },
            { label: "Selection", slug: "plugins/selection" },
            { label: "Canvas Controls", slug: "plugins/canvas-controls" },
            { label: "Pen", slug: "plugins/pen" },
            { label: "Eraser", slug: "plugins/eraser" },
            { label: "Arrows", slug: "plugins/arrows" },
            { label: "Creating Custom Plugins", slug: "plugins/custom-plugin" },
          ],
        },
        {
          label: "Examples",
          items: [
            { label: "Controlling the Canvas", slug: "examples/controlling-canvas" },
            { label: "Zoom to Fit", slug: "examples/zoom-to-fit" },
            { label: "Save & Load Snapshots", slug: "examples/save-load-snapshot" },
            { label: "Read-Only Mode", slug: "examples/read-only-mode" },
            { label: "Lock Camera", slug: "examples/lock-camera" },
            { label: "Custom Keyboard Shortcuts", slug: "examples/custom-keyboard-shortcuts" },
            { label: "Animate Shapes", slug: "examples/animate-shapes" },
            { label: "External UI State", slug: "examples/external-ui-state" },
            { label: "Export as Image", slug: "examples/export-as-image" },
            { label: "Multiple Editors", slug: "examples/multiple-editors" },
            { label: "Custom Grid", slug: "examples/custom-grid" },
            { label: "Custom Block", slug: "examples/custom-block" },
            { label: "Custom Tool", slug: "examples/custom-tool" },
            { label: "Custom Floating Menu", slug: "examples/custom-floating-menu" },
            { label: "Sticker Block Tutorial", slug: "examples/sticker-block-tutorial" },
            { label: "Sticker Block Demo", slug: "examples/sticker-block" },
            { label: "Plugin", slug: "examples/plugin" },
          ],
        },
        {
          label: "API Reference",
          items: [
            { label: "WovenCanvas", slug: "reference/woven-canvas" },
            { label: "Composables", slug: "reference/composables" },
            { label: "Components", slug: "reference/components" },
          ],
        },
      ],
      customCss: ["./src/styles/global.css"],
      components: {
        Footer: "./src/components/Footer.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
    }),
    icon()
  ],
});
