/* oxlint-disable react-hooks/rules-of-hooks, no-console */
/* oxlint-disable react-x/rules-of-hooks, no-console */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import type { TagResponse } from "@store/AmbiApi";
import { TagPicker } from "./TagPicker";

const MOCK_TAGS: TagResponse[] = [
  { id: "tag-1", displayName: "Fantasy", curated: true },
  { id: "tag-2", displayName: "History", curated: true },
  { id: "tag-3", displayName: "Science", curated: false },
  { id: "tag-4", displayName: "Literature", curated: false },
  { id: "tag-5", displayName: "Geography", curated: true },
  { id: "tag-6", displayName: "Mathematics", curated: false },
];

const meta = {
  title: "Common/TagPicker",
  component: TagPicker,
  tags: ["autodocs"],
  args: {
    tags: MOCK_TAGS,
    isLoading: false,
    value: [],
    placeholder: "Add a tag…",
  },
} satisfies Meta<typeof TagPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return <TagPicker {...args} value={value} onChange={setValue} />;
  },
};

export const WithLabel: Story = {
  args: { label: "Deck tags" },
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return <TagPicker {...args} value={value} onChange={setValue} />;
  },
};

export const Preselected: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(["tag-1", "tag-3"]);
    return <TagPicker {...args} value={value} onChange={setValue} />;
  },
};

export const SingleSelect: Story = {
  args: { singleSelect: true, placeholder: "Pick a subject…" },
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return <TagPicker {...args} value={value} onChange={setValue} />;
  },
};

export const Creatable: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    const [tags, setTags] = useState<TagResponse[]>(MOCK_TAGS);
    const onCreate = (displayName: string): Promise<string | undefined> => {
      const newId = `tag-${Date.now()}`;
      setTags((prev) => [...prev, { id: newId, displayName, curated: false }]);
      return Promise.resolve(newId);
    };
    return (
      <TagPicker {...args} tags={tags} value={value} onChange={setValue} onCreate={onCreate} />
    );
  },
};

export const Loading: Story = {
  args: { tags: [], isLoading: true },
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return <TagPicker {...args} value={value} onChange={setValue} />;
  },
};
