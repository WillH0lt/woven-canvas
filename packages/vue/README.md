# 🚀 Jet UI Library

Jet UI Library is a Vue 3-based component library designed to help you build modern and responsive UIs quickly. It leverages the power of Vite, TypeScript, Tailwind CSS, and Storybook to provide a streamlined development experience.

## TODO

- Automate CI/CD build dist on release/tag push
- Component import/export with typing
- Helpers/Composables


## Features

- **Vue 3 & TypeScript**: Fully typed components for better development experience.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **Storybook**: Visualize and document your components in isolation.
- **Vite**: Fast build tool optimized for modern web projects.
- **Tree-shakable**: Import only the components you need.

## Installation

You can install Jet UI Library via npm or yarn by pulling it directly from GitHub:

```bash
npm install git+https://github.com/sjmc11/jet-ui.git#v0.0.1
```

Or using yarn:

```bash
yarn add git+https://github.com/sjmc11/jet-ui.git#v0.0.1
```

## Usage

Import the components you need in your Vue application:

```ts
import { createApp } from 'vue'
import { Button, Card } from 'jet-ui-library'
import 'jet-ui-library/dist/style.css'

const app = createApp(App)

app.component('Button', Button)
app.component('Card', Card)

app.mount('#app')
```

You can also use the components directly in your templates:

```vue
<template>
  <div>
    <Button>Click Me</Button>
    <Card>
      <p>This is a card component.</p>
    </Card>
  </div>
</template>
```

### Storybook

Jet UI Library uses Storybook for component documentation and testing. To start the Storybook server:

```bash
npm run storybook
```

This will launch a local Storybook server where you can interact with and test components.

### Tailwind CSS

Jet UI Library uses Tailwind CSS for styling. Ensure that your project is set up to handle Tailwind's utility classes. If not already configured, you can add Tailwind by following the [official Tailwind CSS installation guide](https://tailwindcss.com/docs/installation).

## Development

If you want to contribute or modify the library, you can clone the repository and start development:

```bash
git clone https://github.com/sjmc11/jet-ui.git
cd jet-ui
npm install
npm run dev
```

### Building the Library

To build the library for production:

```bash
npm run build
```

This will create the library bundle in the `dist/` directory, ready to be published or used as a package.

## Versioning

Jet UI Library uses [SemVer](https://semver.org/) for versioning. For available versions, check the [tags on this repository](https://github.com/yourusername/jet-ui-library/tags).