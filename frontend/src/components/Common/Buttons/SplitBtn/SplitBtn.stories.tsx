import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { PlayIcon } from "@heroicons/react/24/outline";
import {
  DropdownMenuItem,
  DropdownMenuDivider,
} from "@/components/Menus/DropdownMenu";
import { SplitBtn } from "./SplitBtn";
import type { BtnVariant, BtnFill, BtnSize, BtnShape } from "../BtnTypes";

const VARIANTS: BtnVariant[] = [
  "primary",
  "secondary",
  "brand",
  "info",
  "error",
  "success",
  "warning",
  "disabled",
];
const FILLS: BtnFill[] = ["default", "bordered", "ghost"];
const SIZES: BtnSize[] = ["xs", "sm", "md", "lg"];
const SHAPES: BtnShape[] = ["default", "round", "pill", "avatar"];

// SplitBtn pairs a primary action face with a chevron that opens a dropdown.
// `menuItems` is JSX (DropdownMenuItem / DropdownMenuDivider, etc.), so it stays
// inline in the stories like the Btn story keeps its heroicon icons inline.
const menuItems = (
  <>
    <DropdownMenuItem onClick={fn()}>Customize…</DropdownMenuItem>
    <DropdownMenuDivider />
    <DropdownMenuItem onClick={fn()}>Schedule for later</DropdownMenuItem>
  </>
);

const meta = {
  title: "Common/Buttons/SplitBtn",
  component: SplitBtn,
  tags: ["autodocs"],
  args: {
    children: "Play",
    icon: <PlayIcon style={{ width: "1em", height: "1em" }} />,
    variant: "brand",
    menuItems,
    onClick: fn(),
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    fill: { control: "inline-radio", options: FILLS },
    size: { control: "inline-radio", options: SIZES },
    shape: { control: "select", options: SHAPES },
    iconPosition: { control: "inline-radio", options: ["left", "right"] },
    menuPosition: {
      control: "select",
      options: ["bottom-right", "bottom-left", "top-right", "top-left"],
    },
    icon: { control: false },
    menuItems: { control: false },
  },
} satisfies Meta<typeof SplitBtn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bordered: Story = {
  args: { fill: "bordered", variant: "primary" },
};

export const Ghost: Story = {
  args: { fill: "ghost", variant: "info" },
};

export const Loading: Story = {
  args: { isLoading: true, children: "Starting…" },
};

export const Disabled: Story = {
  args: { disabled: true },
};
