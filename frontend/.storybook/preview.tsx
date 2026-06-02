import type { Preview, Decorator } from "@storybook/tanstack-react";
import { useEffect } from "react";
// Pulls in tokens.css, so every story resolves the same CSS custom properties
// (--bg-canvas, --text-primary, hue-derived colors) the real app uses.
import "../src/index.css";

// Mirrors how useTheme applies the look to <html>: theme-light / theme-dark are
// mutually exclusive, and theme-custom layers hue-derived overrides on top. The
// toolbar lets you eyeball any component across all four combinations without
// booting the app. Hues stay at the brand defaults (290/50); the "custom"
// classes still prove the .theme-custom token cascade resolves.
const applyTheme = (theme: string) => {
  const html = document.documentElement;
  const dark = theme.includes("dark");
  html.classList.toggle("theme-dark", dark);
  html.classList.toggle("theme-light", !dark);
  html.classList.toggle("theme-custom", theme.startsWith("custom"));
};

const withTheme: Decorator = (Story, context) => {
  const theme = String(context.globals.theme ?? "light");
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return (
    <div
      style={{
        background: "var(--bg-canvas)",
        color: "var(--text-primary)",
        minHeight: "100vh",
        padding: "2rem",
      }}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "App theme (mirrors useTheme's <html> classes)",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "custom-light", title: "Custom · Light" },
          { value: "custom-dark", title: "Custom · Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: "todo" },
  },
};

export default preview;
