// see nuxt.config.ts
// this file is here so that the IDE can understand the tailwindcss config
module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./studio/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  plugins: [require("@tailwindcss/forms"), require("tailwindcss-rem-to-px")],
  theme: {
    colors: {
      white: "#ffffff",
      black: "#000000",
      transparent: "transparent",
      primary: "var(--color-primary)",
      "primary-light": "var(--color-primary-light)",
      error: "var(--color-error)",
      gray: {
        100: "var(--color-gray-100)",
        200: "var(--color-gray-200)",
        300: "var(--color-gray-300)",
        400: "var(--color-gray-400)",
        500: "var(--color-gray-500)",
        600: "var(--color-gray-600)",
        700: "var(--color-gray-700)",
      },
    },
  },
};
