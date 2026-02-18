// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import icon from "astro-icon";


// https://astro.build/config
export default defineConfig({
  integrations: [
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
          label: "Examples",
          items: [
            { label: "Custom Block", slug: "examples/custom-block" },
            { label: "Custom Tool", slug: "examples/custom-tool" },
            { label: "Custom Floating Menu", slug: "examples/custom-floating-menu" },
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
