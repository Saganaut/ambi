// Covers the image face's overlaid remove-image button: it renders only while
// the card carries an image, names itself after the card, and clears the image
// without opening the gallery picker the image slot itself is wired to.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { emptyImage, externalImage } from "@utils/image";
import { PhraseOrImageCard } from "./PhraseOrImageCard";
import type { PhraseOrImageItem } from "./PhraseOrImageCard";

const renderCard = (item: PhraseOrImageItem = { id: "card_1", label: "Kigali" }) => {
  const props = {
    item,
    itemName: "pair 3 left card",
    displayIndex: "3 · left",
    placeholder: "Type a phrase…",
    labelMaxLength: 60,
    color: "oklch(0.65 0.4 290)",
    menuOpen: false,
    canRemove: true,
    onMenuOpenChange: vi.fn(),
    onScheduleLabel: vi.fn(),
    onFlush: vi.fn(),
    onSetColor: vi.fn(),
    onSetImage: vi.fn(),
    onRemove: vi.fn(),
    openPicker: vi.fn(),
  };
  render(<PhraseOrImageCard {...props} />);
  return props;
};

describe("PhraseOrImageCard", () => {
  it("offers no remove-image button while the card shows its phrase face", () => {
    renderCard();

    expect(screen.queryByRole("button", { name: /remove .* image/i })).not.toBeInTheDocument();
  });

  it("clears the card's image without opening the picker the slot is wired to", async () => {
    const user = userEvent.setup();
    const props = renderCard({
      id: "card_1",
      image: externalImage("https://img.test/a.png"),
    });

    await user.click(screen.getByRole("button", { name: "Remove pair 3 left card image" }));

    expect(props.onSetImage).toHaveBeenCalledExactlyOnceWith(emptyImage());
    expect(props.openPicker).not.toHaveBeenCalled();
  });
});
