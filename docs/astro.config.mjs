// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import vue from "@astrojs/vue";
import icon from "astro-icon";


// https://astro.build/config
export default defineConfig({
  site: "https://woven-canvas.dev",
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
          label: "Quick Start",
          link: "quick-start",
        },
        {
          label: "Learn",
          items: [
            { label: "Architecture", slug: "learn/architecture" },
            { label: "The Editor", slug: "learn/editor" },
            { label: "Blocks", slug: "learn/blocks" },
            { label: "Tools", slug: "learn/tools" },
            { label: "User Interface", slug: "learn/user-interface" },
            { label: "Canvas Store", slug: "learn/canvas-store" },
            { label: "Plugins", slug: "learn/plugins" },
          ],
        },
        {
          label: "Examples",
          items: [
            { label: "Using the Editor API", slug: "examples/editor-api" },
            { label: "Create a Custom Block", slug: "examples/create-a-custom-block" },
            { label: "Create a Plugin", slug: "examples/create-a-plugin" },
          ],
        },
        {
          label: "Plugins Reference",
          items: [
            { label: "Overview", slug: "plugins" },
            { label: "Core", slug: "plugins/core" },
            { label: "Selection", slug: "plugins/selection" },
            { label: "Canvas Controls", slug: "plugins/canvas-controls" },
            { label: "Pen", slug: "plugins/pen" },
            { label: "Eraser", slug: "plugins/eraser" },
            { label: "Arrows", slug: "plugins/arrows" },
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
        Head: "./src/components/Head.astro",
        Footer: "./src/components/Footer.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
    }),
    icon()
  ],
});
