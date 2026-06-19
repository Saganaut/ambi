/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { ImageTile } from "./ImageTile";

const SAMPLE_URL = "https://picsum.photos/seed/ambi/640/360";

const meta = {
  title: "Common/Images/ImageTile",
  component: ImageTile,
  tags: ["autodocs"],
  args: {
    imgUrl: null,
    altText: "Cover image",
    onPick: fn(),
    onClear: fn(),
  },
  render: (args) => {
    const [imgUrl, setImgUrl] = useState(args.imgUrl);
    return (
      <div style={{ width: 320 }}>
        <ImageTile
          {...args}
          imgUrl={imgUrl}
          onPick={() => setImgUrl(SAMPLE_URL)}
          onClear={() => setImgUrl(null)}
        />
      </div>
    );
  },
} satisfies Meta<typeof ImageTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithImage: Story = {
  args: { imgUrl: SAMPLE_URL },
};
