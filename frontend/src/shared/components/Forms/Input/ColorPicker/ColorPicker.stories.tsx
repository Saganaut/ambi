/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { THEME_COLOR_ROLES } from "@utils/roleColors";
import { ColorPicker, type ColorValue } from "./ColorPicker";
import { ColorPickerPanel } from "./ColorPickerPanel";

// A vivid quick-pick palette; real consumers pass the theme's palette roles
// (var(--role-*) refs) so swatches track the active theme.
const SWATCHES: ColorValue[] = [
  "#141414",
  "#e53e3e",
  "#dd6b20",
  "#d69e2e",
  "#38a169",
  "#3182ce",
  "#805ad5",
  "oklch(0.65 0.18 350)",
];

const RECENTS: ColorValue[] = [
  "#25007c",
  "#5600ee",
  "#e53e3e",
  "#dd6b20",
  "#d69e2e",
  "#38a169",
  "#3182ce",
  "#805ad5",
];

// The picker is controlled: the stories wrap it in a stateful host that
// tracks the current value and prepends commits to the Recent row.
const meta = {
  title: "Common/Input/ColorPicker",
  component: ColorPicker,
  tags: ["autodocs"],
  args: {
    value: "#3182ce",
    label: "Text color",
    colorSwatch: SWATCHES,
    recentlyUsedColorSwatch: RECENTS,
    onChange: fn(),
    renderTrigger: () => null,
  },
  argTypes: {
    onChange: { control: false },
    onHover: { control: false },
    onClear: { control: false },
    renderTrigger: { control: false },
    colorSwatch: { control: false },
    recentlyUsedColorSwatch: { control: false },
  },
  render: (args) => {
    const [value, setValue] = useState<string>(args.value ?? "#3182ce");
    const [recents, setRecents] = useState<ColorValue[]>(
      args.recentlyUsedColorSwatch ?? [],
    );
    return (
      <ColorPicker
        {...args}
        value={value}
        recentlyUsedColorSwatch={recents}
        onChange={(color) => {
          args.onChange(color);
          setValue(color);
          setRecents((prev) => [color, ...prev.filter((c) => c !== color)].slice(0, 8));
        }}
        renderTrigger={(props) => (
          <button
            // Floating-ui types the trigger props for a generic HTMLElement;
            // they attach fine to a button at runtime.
            {...(props as React.ButtonHTMLAttributes<HTMLButtonElement> & {
              ref?: React.Ref<HTMLButtonElement>;
            })}
            type='button'
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: value,
              border: "2px solid var(--edge-secondary)",
            }}
            aria-label='Open color picker'
          />
        )}
      />
    );
  },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// Trigger button opening the two-view popover (swatch grid → custom color).
export const Popover: Story = {};

// With a clear (slash) swatch leading the grid.
export const WithClear: Story = {
  args: { onClear: fn() },
};

// Opens directly on the custom color view.
export const OpensOnCustomView: Story = {
  args: { initialView: "custom" },
};

// Opaque-only host (e.g. the slide background, validated to #rrggbb): no
// opacity slider, and every edit stays fully opaque.
export const OpaqueOnly: Story = {
  args: { initialView: "custom", allowAlpha: false },
};

// Production-shaped palette: live var(--role-*) theme refs (roleColors.ts).
// Swatch picks pass the var ref through verbatim so the stored color keeps
// tracking the active theme; loading one into the custom view resolves it
// to a concrete color via the swatch's painted ::after dot.
export const ThemeRoleSwatches: Story = {
  args: {
    colorSwatch: THEME_COLOR_ROLES.map((r) => r.cssVar as ColorValue),
  },
};

// The bare panel, usable outside the popover (e.g. inside a modal).
export const StandalonePanel: Story = {
  render: (args) => (
    <ColorPickerPanel
      value={args.value}
      label={args.label}
      colorSwatch={args.colorSwatch}
      recentlyUsedColorSwatch={args.recentlyUsedColorSwatch}
      onChange={args.onChange}
    />
  ),
};

// The bare custom view: no swatch grid behind it, so no back chevron.
export const StandaloneCustomView: Story = {
  render: (args) => (
    <ColorPickerPanel
      value={args.value}
      initialView='custom'
      colorSwatch={args.colorSwatch}
      recentlyUsedColorSwatch={args.recentlyUsedColorSwatch}
      onChange={args.onChange}
    />
  ),
};
