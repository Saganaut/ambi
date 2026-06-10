/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { Pagination } from "./Pagination";

const meta = {
  title: "Common/Pagination/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  args: {
    page: 0,
    pageCount: 12,
    onPageChange: fn(),
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

// Controlled wrapper so clicking pages actually moves the active page.
const ControlledPagination = (args: React.ComponentProps<typeof Pagination>) => {
  const [page, setPage] = useState(args.page);
  return (
    <Pagination
      {...args}
      page={page}
      onPageChange={(next) => {
        args.onPageChange(next);
        setPage(next);
      }}
    />
  );
};

export const KnownTotal: Story = {
  render: (args) => <ControlledPagination {...args} />,
};

export const Compact: Story = {
  args: { pageCount: 12, compact: true },
  render: (args) => <ControlledPagination {...args} />,
};

export const ManyPages: Story = {
  args: { pageCount: 50, page: 24 },
  render: (args) => <ControlledPagination {...args} />,
};

export const UnknownTotal: Story = {
  args: { page: 0, pageCount: undefined, hasMore: true, onPageChange: fn() },
  render: (args) => <ControlledPagination {...args} />,
};
