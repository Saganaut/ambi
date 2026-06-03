import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { LoginModal } from "./LoginModal";

// LoginModal is the body rendered inside the shared modal dialog. It reads no
// Redux/RTK Query state — only the apiBaseUrl constant — so no withStore
// decorator is needed. Provider buttons navigate to the OAuth entry point on
// click; in Storybook that simply attempts a window.location.assign.
const meta = {
  title: "Common/LoginModal/LoginModal",
  component: LoginModal,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof LoginModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: {
    message: "Sign in to save this deck to your library.",
  },
};

export const WithReturnUrl: Story = {
  args: {
    message: "Please sign in to continue editing.",
    returnUrl: "/decks/lotr-trivia/edit",
  },
};
