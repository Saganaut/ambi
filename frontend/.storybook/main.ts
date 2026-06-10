import type { StorybookConfig } from "@storybook/react-vite";
// Scoped to the design-system surface: stories live next to the components
// they document (CSF3), plus any hand-written .mdx docs pages. svgr, path
// aliases (@/*), the React Compiler babel pass, and CSS Modules are all
// inherited from ../vite.config.ts by the tanstack-react (Vite) framework, so
// there is no builder config to repeat here.
//
// Deliberately NOT wired: @storybook/addon-vitest / Playwright browser-mode.
// That addon has known breakage on this repo's Vite 8, and the existing
// Vitest + Testing Library suite already covers component tests. See
// z-docs and the project plan for the rationale.
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
};

export default config;
