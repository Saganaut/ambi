// Unit tests for OutcomeBanner — the verdict contract every scored board leans
// on: which of the two lines is shown, that the success/error styling follows
// the verdict rather than the wording, and that an absent outcome renders no
// element at all.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ParticipantOutcome } from "../../../../store/liveSessionEvents";
import { OutcomeBanner } from "./OutcomeBanner";

const outcome = (overrides: Partial<ParticipantOutcome> = {}): ParticipantOutcome => ({
  participantId: "viewer-1",
  choice: null,
  correct: true,
  points: 0,
  responseTimeMs: 0,
  ...overrides,
});

describe("OutcomeBanner", () => {
  it("renders the correct line for a correct outcome", () => {
    render(
      <OutcomeBanner
        outcome={outcome({ correct: true })}
        correctText="You nailed it ✓"
        wrongText="Not quite."
      />,
    );

    expect(screen.getByText("You nailed it ✓")).toBeInTheDocument();
    expect(screen.queryByText("Not quite.")).not.toBeInTheDocument();
  });

  it("renders the wrong line for an incorrect outcome", () => {
    render(
      <OutcomeBanner
        outcome={outcome({ correct: false })}
        correctText="You nailed it ✓"
        wrongText="Not quite."
      />,
    );

    expect(screen.getByText("Not quite.")).toBeInTheDocument();
    expect(screen.queryByText("You nailed it ✓")).not.toBeInTheDocument();
  });

  it("styles the two verdicts apart", () => {
    const { container: correctContainer } = render(
      <OutcomeBanner
        outcome={outcome({ correct: true })}
        correctText="Right"
        wrongText="Wrong"
      />,
    );
    const { container: wrongContainer } = render(
      <OutcomeBanner
        outcome={outcome({ correct: false })}
        correctText="Right"
        wrongText="Wrong"
      />,
    );

    expect(correctContainer.firstElementChild?.className).toContain("outcomeCorrect");
    expect(wrongContainer.firstElementChild?.className).toContain("outcomeWrong");
  });

  it("renders nothing without an outcome", () => {
    const { container } = render(
      <OutcomeBanner outcome={undefined} correctText="Right" wrongText="Wrong" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
