// Covers the option thumbnail's overlaid remove-image button: it appears only
// for an option that has an image, names itself after the option's number, and
// clears the image rather than opening the gallery picker.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { McqOption } from "@deck/store/deckApi.gen";
import { emptyImage, externalImage } from "@utils/image";
import { AllocationOptionEditable } from "./AllocationOptionEditable";

const option = (overrides: Partial<McqOption> = {}): McqOption => ({
  id: "opt_a",
  optionType: "TEXT",
  text: "Marketing",
  ...overrides,
});

const renderOption = (item: McqOption = option()) => {
  const props = {
    option: item,
    sortIndex: 1,
    color: "oklch(0.65 0.4 290)",
    menuOpen: false,
    canRemove: true,
    totalPoints: 100,
    answer: undefined,
    answerSeed: 50,
    onMenuOpenChange: vi.fn(),
    onScheduleText: vi.fn(),
    onFlush: vi.fn(),
    onSetColor: vi.fn(),
    onSetImage: vi.fn(),
    onScheduleAnswer: vi.fn(),
    onCommitAnswer: vi.fn(),
    onClearAnswer: vi.fn(),
    onRemove: vi.fn(),
    openPicker: vi.fn(),
  };
  render(<AllocationOptionEditable {...props} />);
  return props;
};

describe("AllocationOptionEditable", () => {
  it("offers a dedicated reorder grip", () => {
    renderOption();

    expect(screen.getByRole("button", { name: "Reorder option 2" })).toBeInTheDocument();
  });

  it("offers no remove-image button for an option without an image", () => {
    renderOption();

    expect(screen.queryByRole("button", { name: /remove option/i })).not.toBeInTheDocument();
  });

  it("clears the option's image instead of reopening the picker", async () => {
    const user = userEvent.setup();
    const props = renderOption(option({ image: externalImage("https://img.test/a.png") }));

    await user.click(screen.getByRole("button", { name: "Remove option 2 image" }));

    expect(props.onSetImage).toHaveBeenCalledExactlyOnceWith(emptyImage());
    expect(props.openPicker).not.toHaveBeenCalled();
  });
});
