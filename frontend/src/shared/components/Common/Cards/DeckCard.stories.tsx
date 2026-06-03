import type { Meta, StoryObj } from "@storybook/tanstack-react";
import type { DeckResponse } from "@/store/AmbiApi";
import { Btn } from "@common/Buttons/Btn";
import { DeckCard } from "./DeckCard";

// DeckCard is purely presentational — it takes a DeckResponse via props and
// reads no Redux/RTK Query state — so no withStore decorator is needed here.
const mockDeck: DeckResponse = {
  id: "deck-1",
  publicId: "lotr-trivia",
  name: "Lord of the Rings Trivia",
  description: "Test your knowledge of Middle-earth across three ages.",
  coverImage: {
    external: true,
    externalSrc: "https://picsum.photos/seed/lotr/480/270",
    altText: "",
  },
  version: 3,
  publishStatus: "PUBLISHED",
  visibility: "PUBLIC",
  language: "en",
  creatorUserId: "user-1",
  originalAuthorUserId: "user-1",
  tags: ["fantasy", "books", "movies"],
  ownership: { type: "USER", ownerId: "user-1" },
  acl: [],
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-05-20T14:30:00Z",
  permissions: { canView: true, canEdit: true, canManage: true },
};

const meta = {
  title: "Common/Cards/DeckCard",
  component: DeckCard,
  tags: ["autodocs"],
  args: { deck: mockDeck, variant: "compact" },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["full", "discovery", "compact"],
    },
  },
} satisfies Meta<typeof DeckCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compact: Story = {};

export const Full: Story = {
  args: { variant: "full" },
};

export const Discovery: Story = {
  args: { variant: "discovery" },
};

export const Draft: Story = {
  args: {
    variant: "full",
    deck: {
      ...mockDeck,
      publishStatus: "DRAFT",
      name: "Untitled deck (draft)",
    },
  },
};

export const WithActions: Story = {
  args: {
    variant: "full",
    actions: (
      <Btn size='xs' fill='ghost'>
        Edit
      </Btn>
    ),
  },
};
