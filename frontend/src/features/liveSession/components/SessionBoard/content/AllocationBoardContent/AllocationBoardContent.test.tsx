// Tests for the Allocation board: the per-option point entry and the
// exact-pool gating on Submit (the server validates the map's sum, so a partial
// spend must never be sendable), the zeros-included payload, resubmit-until-lock,
// the share / average aggregation from the `optionId@points` tally keys (whose
// zero-point entries make an option's row sum its respondent count), the
// read-only projected view, and the reveal — key pills from the live event copy
// or the snapshot seam, plus the viewer's own outcome. The session connection
// and the live read model are mocked, with the read model mutable per test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";

const h = vi.hoisted(() => ({
  sendAnswer: vi.fn(),
  query: {
    optionCounts: {} as Record<string, number>,
    results: null as unknown,
    viewerParticipantId: "p-me" as string | null,
    allocationTargets: null as unknown,
  },
}));

vi.mock("@/features/liveSession/views/SessionPage/SessionConnectionContext", () => ({
  useSessionConnection: () => ({ sendAnswer: h.sendAnswer }),
}));
vi.mock("@/features/liveSession/hooks/useLiveSessionQuery", () => ({
  useLiveSessionQuery: () => h.query,
}));

import { AllocationBoardContent } from "./AllocationBoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "ALLOCATION",
  allocation: {
    totalPointsToAllocate: 12,
    options: [
      { id: "alloc_frodo", text: "Frodo", color: "#ff8800" },
      { id: "alloc_sam", text: "Sam" },
      { id: "alloc_merry", text: "Merry" },
      { id: "alloc_pippin", text: "Pippin" },
    ],
  },
};

const renderContent = (mode: BoardQuestionMode = "prompt", interactive = true) =>
  render(<AllocationBoardContent slide={slide} mode={mode} interactive={interactive} />);

/** Type `points` into the entry labelled for `name`. */
const allocate = (name: string, points: string) => {
  fireEvent.change(screen.getByRole("spinbutton", { name: `${name} points` }), {
    target: { value: points },
  });
};

const resetQuery = () => {
  vi.clearAllMocks();
  h.query.optionCounts = {};
  h.query.results = null;
  h.query.viewerParticipantId = "p-me";
  h.query.allocationTargets = null;
};

describe("AllocationBoardContent answering", () => {
  beforeEach(resetQuery);

  it("offers one point entry per option, all empty, with Submit gated", () => {
    renderContent();

    const entries = screen.getAllByRole("spinbutton");
    expect(entries).toHaveLength(4);
    for (const entry of entries) expect(entry).toHaveValue(0);
    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();
  });

  it("submits every option, zeros included, once the pool is spent exactly", async () => {
    renderContent();

    allocate("Frodo", "7");
    allocate("Sam", "5");
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "AllocationAnswer",
      allocations: { alloc_frodo: 7, alloc_sam: 5, alloc_merry: 0, alloc_pippin: 0 },
    });
  });

  it("keeps Submit gated while the pool is under-spent", () => {
    renderContent();

    allocate("Frodo", "5");

    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();
    expect(screen.getByText("Allocate all 12 points to submit.")).toBeInTheDocument();
    expect(screen.getByText("7 of 12 points left")).toBeInTheDocument();
    expect(h.sendAnswer).not.toHaveBeenCalled();
  });

  it("keeps Submit gated while the pool is over-spent", () => {
    renderContent();

    allocate("Frodo", "9");
    allocate("Sam", "6");

    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();
    expect(screen.getByText("You've allocated 3 too many.")).toBeInTheDocument();
  });

  it("clamps an entry to the pool and never lets a non-numeric entry become NaN", () => {
    renderContent();

    allocate("Frodo", "99");
    expect(screen.getByRole("spinbutton", { name: "Frodo points" })).toHaveValue(12);

    allocate("Frodo", "abc");
    expect(screen.getByRole("spinbutton", { name: "Frodo points" })).toHaveValue(0);
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("allows resubmitting an adjusted split until the round locks", async () => {
    renderContent();

    allocate("Frodo", "12");
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(screen.getByText("Answer submitted ✓")).toBeInTheDocument();

    allocate("Frodo", "6");
    allocate("Sam", "6");
    await userEvent.click(screen.getByRole("button", { name: "Update answer" }));

    expect(h.sendAnswer).toHaveBeenCalledTimes(2);
    expect(h.sendAnswer).toHaveBeenLastCalledWith("el-0", {
      answerType: "AllocationAnswer",
      allocations: { alloc_frodo: 6, alloc_sam: 6, alloc_merry: 0, alloc_pippin: 0 },
    });
  });

  it("drops the draft when the round changes", () => {
    const { rerender } = renderContent();

    allocate("Frodo", "12");
    expect(screen.getByRole("spinbutton", { name: "Frodo points" })).toHaveValue(12);

    rerender(
      <AllocationBoardContent slide={{ ...slide, id: "el-1" }} mode="prompt" interactive />,
    );

    expect(screen.getByRole("spinbutton", { name: "Frodo points" })).toHaveValue(0);
  });

  it("is read-only when not interactive (projected / host view)", () => {
    renderContent("prompt", false);

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit answer" })).not.toBeInTheDocument();
    expect(screen.getByText("Players are splitting 12 points across 4 options.")).toBeInTheDocument();
  });

  it("is read-only at results even for a participant", () => {
    renderContent("results", true);

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit answer" })).not.toBeInTheDocument();
  });
});

describe("AllocationBoardContent aggregate and reveal", () => {
  beforeEach(resetQuery);

  it("derives each option's total, average and share from the optionId@points tally", () => {
    // Three respondents: two split 6/6, one put all 12 on Sam.
    h.query.optionCounts = {
      "alloc_frodo@6": 2,
      "alloc_frodo@0": 1,
      "alloc_sam@6": 2,
      "alloc_sam@12": 1,
    };
    renderContent("liveResults", false);

    expect(screen.getByText("4.0 of 12")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("8.0 of 12")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("counts responses from the busiest option's row, not the sum of all rows", () => {
    h.query.optionCounts = { "alloc_frodo@1": 5, "alloc_sam@11": 2 };
    renderContent("liveResults", false);

    expect(screen.getByText("5 responses")).toBeInTheDocument();
  });

  it("drops malformed and out-of-range tally keys rather than rendering NaN", () => {
    h.query.optionCounts = {
      "@3": 4,
      "alloc_frodo@x": 2,
      "alloc_frodo@99": 7,
      "alloc_frodo@6": 1,
    };
    renderContent("liveResults", false);

    expect(screen.getByText("6.0 of 12")).toBeInTheDocument();
    expect(screen.getByText("1 response")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("says so when nothing has been submitted yet", () => {
    renderContent("liveResults", false);

    expect(screen.getByText("No responses yet.")).toBeInTheDocument();
    expect(screen.queryByText(/of 12$/)).not.toBeInTheDocument();
  });

  it("shows no distribution at prompt, even with a populated tally", () => {
    h.query.optionCounts = { "alloc_frodo@12": 3 };
    renderContent("prompt", true);

    expect(screen.queryByText("12.0 of 12")).not.toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });

  it("reveals no key for a collect-only round", () => {
    h.query.optionCounts = { "alloc_frodo@12": 1 };
    h.query.results = {
      slideId: "el-0",
      outcomes: [],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      allocationTargets: null,
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.queryByText(/^Key /)).not.toBeInTheDocument();
  });

  it("reveals the key splits carried by the round result", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      allocationTargets: [{ optionId: "alloc_frodo", points: 6, tolerance: 1 }],
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.getByText("Key 6 ±1")).toBeInTheDocument();
  });

  it("falls back to the snapshot's key splits for a late joiner", () => {
    h.query.allocationTargets = [{ optionId: "alloc_sam", points: 12, tolerance: 0 }];
    renderContent("results", false);

    expect(screen.getByText("Key 12 ±0")).toBeInTheDocument();
  });

  it("ignores a result carrying another slide's round", () => {
    h.query.results = {
      slideId: "el-9",
      outcomes: [],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      allocationTargets: [{ optionId: "alloc_frodo", points: 6, tolerance: 1 }],
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.queryByText(/^Key /)).not.toBeInTheDocument();
  });

  it("banners the viewer's own outcome at results on a keyed round", () => {
    const revealed = (correct: boolean) => ({
      slideId: "el-0",
      outcomes: [{ participantId: "p-me", choice: null, correct, points: 0, responseTimeMs: 5 }],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      allocationTargets: [{ optionId: "alloc_frodo", points: 6, tolerance: 1 }],
      terminal: false,
    });

    h.query.results = revealed(true);
    const { rerender, unmount } = renderContent("results", false);
    expect(screen.getByText("You split it right ✓")).toBeInTheDocument();

    h.query.results = revealed(false);
    rerender(<AllocationBoardContent slide={slide} mode="results" interactive={false} />);
    expect(screen.getByText("Not quite — your split was off.")).toBeInTheDocument();
    unmount();
  });

  it("banners nothing on a collect-only round, which grades everyone wrong", () => {
    const revealed = {
      slideId: "el-0",
      outcomes: [
        { participantId: "p-me", choice: null, correct: false, points: 0, responseTimeMs: 5 },
      ],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      allocationTargets: [],
      terminal: false,
    };

    h.query.results = revealed;
    const { rerender, unmount } = renderContent("results", false);
    expect(screen.queryByText("Not quite — your split was off.")).not.toBeInTheDocument();
    expect(screen.queryByText("You split it right ✓")).not.toBeInTheDocument();

    // Same when the round carries no key list at all and the snapshot seam is
    // empty too.
    h.query.results = { ...revealed, allocationTargets: null };
    h.query.allocationTargets = [];
    rerender(<AllocationBoardContent slide={slide} mode="results" interactive={false} />);
    expect(screen.queryByText("Not quite — your split was off.")).not.toBeInTheDocument();
    unmount();
  });
});
