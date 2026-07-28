// Tests for the Scales board: per-statement normalized range sliders, the
// touched-gating on Submit (untouched sliders sit at the midpoint but never
// enter the draft), submit/update resubmit-until-lock, the per-statement
// 10-bucket heat aggregation from the quantized statementId@bucket tally keys,
// the read-only projected view, and the own-outcome banner. The session
// connection and the live read model are mocked, with the read model mutable
// per test.
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
  },
}));

vi.mock(
  "@/features/liveSession/views/SessionPage/SessionConnectionContext",
  () => ({
    useSessionConnection: () => ({ sendAnswer: h.sendAnswer }),
  }),
);
vi.mock("@/features/liveSession/hooks/useLiveSessionQuery", () => ({
  useLiveSessionQuery: () => h.query,
}));

import { ScalesBoardContent } from "./ScalesBoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "SCALES",
  scales: {
    min: 1,
    max: 5,
    leftLabel: "Skip it",
    rightLabel: "Sacred",
    items: [
      { id: "meal_a", label: "Breakfast" },
      { id: "meal_b", label: "Elevenses" },
    ],
  },
};

const renderContent = (mode: BoardQuestionMode = "prompt", interactive = true) =>
  render(<ScalesBoardContent slide={slide} mode={mode} interactive={interactive} />);

/** Drag the slider labeled `name` to a normalized position in [0, 1]. */
const rate = (name: string, position: number) => {
  fireEvent.change(screen.getByRole("slider", { name }), {
    target: { value: position.toString() },
  });
};

describe("ScalesBoardContent rating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("submits the normalized positions map once every statement is rated", async () => {
    renderContent();
    // Nothing touched yet → Submit gated.
    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();

    rate("Breakfast", 0.75);
    rate("Elevenses", 0.25);
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "ScalesAnswer",
      positions: { meal_a: 0.75, meal_b: 0.25 },
    });
  });

  it("keeps Submit gated until every statement is touched (midpoint is not enough)", async () => {
    renderContent();

    // Rate only one; the other sits at the midpoint but is untouched.
    rate("Breakfast", 0.6);

    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();
    expect(h.sendAnswer).not.toHaveBeenCalled();
  });

  it("allows resubmitting an adjusted map until the round locks", async () => {
    renderContent();

    rate("Breakfast", 0.75);
    rate("Elevenses", 0.25);
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(screen.getByText("Answer submitted ✓")).toBeInTheDocument();

    // The surface stays live after submitting: adjust one and re-send.
    rate("Elevenses", 0.9);
    await userEvent.click(screen.getByRole("button", { name: "Update answer" }));

    expect(h.sendAnswer).toHaveBeenCalledTimes(2);
    expect(h.sendAnswer).toHaveBeenLastCalledWith("el-0", {
      answerType: "ScalesAnswer",
      positions: { meal_a: 0.75, meal_b: 0.9 },
    });
  });

  it("announces the scale-unit readout via aria-valuetext", () => {
    renderContent();

    rate("Breakfast", 0.5); // 1 + 0.5·4 = 3
    expect(screen.getByRole("slider", { name: "Breakfast" })).toHaveAttribute(
      "aria-valuetext",
      "3",
    );
  });

  it("is read-only when not interactive (projected / host view)", () => {
    renderContent("prompt", false);

    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submit answer" }),
    ).not.toBeInTheDocument();
  });
});

describe("ScalesBoardContent results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // meal_a: buckets 7 (count 3) and 8 (count 1); meal_b: bucket 2 (count 2);
    // a reconciled-away zero must not surface.
    h.query.optionCounts = {
      "meal_a@7": 3,
      "meal_a@8": 1,
      "meal_b@2": 2,
      "meal_a@5": 0,
    };
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("aggregates the statementId@bucket tally into per-statement heat, sliders gone", () => {
    renderContent("liveResults", false);

    // Non-empty buckets are labeled; the zero-count key does not render.
    expect(screen.getByLabelText("Breakfast: 3 at bucket 8")).toBeInTheDocument();
    expect(screen.getByLabelText("Breakfast: 1 at bucket 9")).toBeInTheDocument();
    expect(screen.getByLabelText("Elevenses: 2 at bucket 3")).toBeInTheDocument();
    expect(screen.queryByLabelText(/at bucket 6/)).not.toBeInTheDocument();
    // Projected view: no sliders.
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("banners the viewer's own outcome at results", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [
        { participantId: "p-me", choice: null, correct: true, points: 0, responseTimeMs: 5 },
      ],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.getByText("You rated everything on target ✓")).toBeInTheDocument();
  });
});
