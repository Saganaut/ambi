import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Btn } from "../Buttons/Btn";
import { Tooltip } from "./Tooltip";

const POSITIONS: NonNullable<React.ComponentProps<typeof Tooltip>["position"]>[] =
  ["top", "bottom", "left", "right"];

const meta = {
  title: "Common/Tooltip/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  args: {
    label: "Helpful hint",
    position: "top",
    children: <Btn>Hover me</Btn>,
  },
  argTypes: {
    position: { control: "inline-radio", options: POSITIONS },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Positions: Story = {
  render: (args) => (
    <div
      style={{
        display: "flex",
        gap: "3rem",
        padding: "4rem",
        flexWrap: "wrap",
      }}>
      {POSITIONS.map((position) => (
        <Tooltip key={position} {...args} position={position} label={`${position} tooltip`}>
          <Btn>{position}</Btn>
        </Tooltip>
      ))}
    </div>
  ),
};
