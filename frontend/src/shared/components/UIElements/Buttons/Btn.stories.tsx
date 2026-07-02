/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Btn } from "./Btn";
import type { BtnVariant, BtnFill, BtnSize } from "./Btn.types";

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

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
    {children}
  </div>
);

const meta = {
  title: "Common/Buttons/Btn",
  component: Btn,
  tags: ["autodocs"],
  args: { children: "Button", onClick: fn() },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    fill: { control: "inline-radio", options: FILLS },
    size: { control: "inline-radio", options: SIZES },
    shape: { control: "select", options: ["default", "round", "pill", "avatar"] },
  },
} satisfies Meta<typeof Btn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Variants: Story = {
  render: (args) => (
    <Row>
      {VARIANTS.map((variant) => (
        <Btn key={variant} {...args} variant={variant}>
          {variant}
        </Btn>
      ))}
    </Row>
  ),
};

export const Fills: Story = {
  render: (args) => (
    <Row>
      {FILLS.map((fill) => (
        <Btn key={fill} {...args} fill={fill}>
          {fill}
        </Btn>
      ))}
    </Row>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <Row>
      {SIZES.map((size) => (
        <Btn key={size} {...args} size={size}>
          {size}
        </Btn>
      ))}
    </Row>
  ),
};

export const WithIcon: Story = {
  args: {
    children: "Add deck",
    icon: <PlusIcon style={{ width: "1em", height: "1em" }} />,
  },
};

export const Loading: Story = {
  args: { isLoading: true, children: "Saving…" },
};

// Demonstrates an in-browser interaction without the test-runner: the play
// function runs whenever this story is viewed in the Storybook UI.
export const Clickable: Story = {
  args: { children: "Click me" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /click me/i });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
  },
};
