# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some lint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Linting

JavaScript/TypeScript linting is done with [oxlint](https://oxc.rs/docs/guide/usage/linter.html), configured in `.oxlintrc.json` with type-aware checks enabled:

```bash
npm run lint
```

CSS is linted separately with Stylelint (`npm run lint:css`); `npm run lint:all` runs both.
