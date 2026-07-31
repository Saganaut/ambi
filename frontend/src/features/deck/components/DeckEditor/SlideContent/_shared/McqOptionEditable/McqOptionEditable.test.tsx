// Covers the option thumbnail's overlaid remove-image button: when it renders,
// the accessible name it carries, and that clearing an image neither escapes to
// the card's click target nor reports the wrong option.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ChartDatum } from "@/shared/components/Charts/Chart.types";
import { McqOptionEditable } from "./McqOptionEditable";

const datum = (overrides: Partial<ChartDatum> = {}): ChartDatum => ({
  id: "opt_a",
  value: 3,
  text: "Amsterdam",
  optionType: "TEXT",
  ...overrides,
});

const renderOption = ({
  option = datum(),
  sortIndex = 1,
  onClearImage,
  onCardClick,
}: {
  option?: ChartDatum;
  sortIndex?: number;
  onClearImage?: (datumId: string) => void;
  onCardClick?: () => void;
} = {}) =>
  render(
    // Stands in for the surrounding click/sort target the card lives inside.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div onClick={onCardClick}>
      <McqOptionEditable
        datum={option}
        sortIndex={sortIndex}
        denominator={10}
        highestValue={5}
        displayAsPercentage={false}
        onClearImage={onClearImage}
      />
    </div>,
  );

describe("McqOptionEditable", () => {
  it("offers no remove-image button for an option without an image", () => {
    renderOption({ onClearImage: vi.fn() });

    expect(screen.queryByRole("button", { name: /remove option/i })).not.toBeInTheDocument();
  });

  it("offers no remove-image button when the surface passes no clear handler", () => {
    renderOption({ option: datum({ imageUrl: "https://img.test/a.png" }) });

    expect(screen.queryByRole("button", { name: /remove option/i })).not.toBeInTheDocument();
  });

  it("names the remove-image button after the option's letter", () => {
    renderOption({
      option: datum({ imageUrl: "https://img.test/a.png" }),
      sortIndex: 2,
      onClearImage: vi.fn(),
    });

    expect(screen.getByRole("button", { name: "Remove option C image" })).toBeInTheDocument();
  });

  it("clears the option's image without triggering the card's own click", async () => {
    const user = userEvent.setup();
    const onClearImage = vi.fn();
    const onCardClick = vi.fn();
    renderOption({
      option: datum({ id: "opt_b", imageUrl: "https://img.test/a.png" }),
      onClearImage,
      onCardClick,
    });

    await user.click(screen.getByRole("button", { name: "Remove option B image" }));

    expect(onClearImage).toHaveBeenCalledExactlyOnceWith("opt_b");
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
