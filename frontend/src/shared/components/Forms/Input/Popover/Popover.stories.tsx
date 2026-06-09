/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import {
  Popover,
  PopoverRow,
  PopoverButton,
  PopoverDivider,
  PopoverGroupLabel,
} from "./Popover";
import {
  formattingButtons,
  fontSizeButtons,
  menuItems,
} from "./Popover.mocks";

const meta = {
  title: "Common/Input/Popover",
  component: Popover,
  tags: ["autodocs"],
  args: {
    role: "dialog",
    ariaLabel: "Popover",
    children: <PopoverGroupLabel>Popover content</PopoverGroupLabel>,
  },
  argTypes: {
    role: { control: "inline-radio", options: ["dialog", "toolbar", "menu"] },
    children: { control: false },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// A formatting toolbar — the primary in-app use of the Popover primitives.
export const FormattingToolbar: Story = {
  args: {
    role: "toolbar",
    ariaLabel: "Text formatting",
    children: (
      <PopoverRow>
        {formattingButtons.map((btn) => (
          <PopoverButton
            key={btn.ariaLabel}
            ariaLabel={btn.ariaLabel}
            isActive={btn.isActive}
            preventFocusSteal
            onClick={fn()}>
            {btn.label}
          </PopoverButton>
        ))}
        <PopoverDivider />
        {fontSizeButtons.map((btn) => (
          <PopoverButton
            key={btn.ariaLabel}
            ariaLabel={btn.ariaLabel}
            isActive={btn.isActive}
            preventFocusSteal
            onClick={fn()}>
            {btn.label}
          </PopoverButton>
        ))}
      </PopoverRow>
    ),
  },
};

export const Menu: Story = {
  args: {
    role: "menu",
    ariaLabel: "Actions",
    children: (
      <PopoverRow>
        {menuItems.map((item) => (
          <PopoverButton key={item} ariaLabel={item} onClick={fn()}>
            {item}
          </PopoverButton>
        ))}
      </PopoverRow>
    ),
  },
};
