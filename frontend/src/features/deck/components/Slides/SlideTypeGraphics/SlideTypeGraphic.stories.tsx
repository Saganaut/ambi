/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { fn } from "storybook/test";
import { SlideTypeGraphic } from "./SlideTypeGraphic";
import { ALL_SLIDE_KINDS } from "./SlideTypeGraphic.mocks";

const SIZES = ["xs", "sm", "md", "lg"] as const;
const FILLS = ["default", "bordered", "ghost"] as const;

const meta = {
  title: "Common/Slides/SlideTypeGraphic",
  component: SlideTypeGraphic,
  tags: ["autodocs"],
  args: {
    slideType: "MCQ",
    size: "md",
    fill: "ghost",
    onClick: fn(),
  },
  argTypes: {
    slideType: { control: "select", options: ALL_SLIDE_KINDS },
    size: { control: "inline-radio", options: SIZES },
    fill: { control: "inline-radio", options: FILLS },
  },
} satisfies Meta<typeof SlideTypeGraphic>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bordered: Story = {
  args: { fill: "bordered" },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {SIZES.map((size) => (
        <SlideTypeGraphic key={size} {...args} size={size} />
      ))}
    </div>
  ),
};

// One graphic per slide/question kind so authors can eyeball the full set.
export const AllKinds: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
      {ALL_SLIDE_KINDS.map((kind) => (
        <SlideTypeGraphic key={kind} {...args} slideType={kind} title={kind} />
      ))}
    </div>
  ),
};
