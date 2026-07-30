// Tests for the follow-up board: the candidate cards minted from the parent
// round render in snapshot order, a pick posts a FollowUpAnswer over the session
// connection, the viewer's own candidate is un-pickable, and the tally/reveal
// moments read their distribution from the right source. The session connection
// and the live read model are mocked, so each test drives the component with a
// static read-model shape.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";

/** The mocked read model, rewritten per test before rendering. */
interface ReadModel {
  optionCounts: Record<string, number>;
  results: {
    slideId: string;
    optionCounts: Record<string, number>;
    correctOption: string | null;
  } | null;
  myFollowUpOptionId: string | null;
}

const h = vi.hoisted(() => ({
  sendAnswer: vi.fn(),
  state: {
    optionCounts: {} as Record<string, number>,
    results: null as ReadModel["results"],
    myFollowUpOptionId: null as string | null,
  },
}));

vi.mock(
  "@/features/liveSession/views/SessionPage/SessionConnectionContext",
  () => ({
    useSessionConnection: () => ({ sendAnswer: h.sendAnswer }),
  }),
);
vi.mock("@/features/liveSession/hooks/useLiveSessionQuery", () => ({
  useLiveSessionQuery: () => h.state,
}));

import { FollowUpBoardContent } from "./FollowUpBoardContent";

const slide: SlideView = {
  id: "el-1",
  contentType: "FOLLOW_UP",
  title: "Which answer was best?",
  followUp: {
    mode: "BEST_ANSWER_VOTE",
    parentSlideId: "el-0",
    parentTitle: "<p>Name a fruit</p>",
    options: [
      { optionId: "o1", text: "Apple" },
      { optionId: "o2", text: "Banana" },
      { optionId: "o3", text: "Cherry" },
    ],
  },
};

const drawingSlide: SlideView = {
  ...slide,
  followUp: {
    ...slide.followUp,
    options: [
      { optionId: "d1", imageUrl: "https://s3.test/one.png" },
      { optionId: "d2", text: "Banana" },
    ],
  },
};

const emptySlide: SlideView = {
  ...slide,
  followUp: { ...slide.followUp, options: [] },
};

const renderContent = (
  slideView: SlideView = slide,
  mode: BoardQuestionMode = "prompt",
  interactive = true,
) =>
  render(
    <FollowUpBoardContent
      slide={slideView}
      mode={mode}
      interactive={interactive}
    />,
  );

describe("FollowUpBoardContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.state.optionCounts = {};
    h.state.results = null;
    h.state.myFollowUpOptionId = null;
  });

  it("renders one card per candidate, in snapshot order", () => {
    renderContent();

    const labels = screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) => text !== null && text !== "Lock in your pick");

    expect(labels).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("shows the mode prompt and the parent question", () => {
    renderContent();

    expect(screen.getByText("Vote for the best answer")).toBeInTheDocument();
    expect(screen.getByText("Name a fruit")).toBeInTheDocument();
  });

  it("renders a drawing candidate as an image with its presigned URL", () => {
    renderContent(drawingSlide);

    const image = screen.getByRole("img", { name: "A submitted drawing" });
    expect(image).toHaveAttribute("src", "https://s3.test/one.png");
  });

  it("posts a FollowUpAnswer for the picked candidate", async () => {
    renderContent();

    await userEvent.click(screen.getByRole("button", { name: "Banana" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Lock in your pick" }),
    );

    expect(h.sendAnswer).toHaveBeenCalledWith("el-1", {
      answerType: "FollowUpAnswer",
      optionId: "o2",
    });
  });

  it("single-select: a second tap replaces the first pick", async () => {
    renderContent();

    await userEvent.click(screen.getByRole("button", { name: "Apple" }));
    await userEvent.click(screen.getByRole("button", { name: "Cherry" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Lock in your pick" }),
    );

    expect(h.sendAnswer).toHaveBeenCalledExactlyOnceWith("el-1", {
      answerType: "FollowUpAnswer",
      optionId: "o3",
    });
  });

  it("disables and badges the viewer's own candidate", async () => {
    h.state.myFollowUpOptionId = "o1";
    renderContent();

    const own = screen.getByRole("button", { name: /Apple/ });
    expect(own).toBeDisabled();
    expect(own).toHaveAttribute("aria-disabled", "true");
    expect(own).toHaveTextContent("Your answer");

    await userEvent.click(own);
    expect(
      screen.getByRole("button", { name: "Lock in your pick" }),
    ).toBeDisabled();
    expect(h.sendAnswer).not.toHaveBeenCalled();
  });

  it("is read-only when not interactive (projected / host view)", () => {
    renderContent(slide, "prompt", false);

    expect(
      screen.queryByRole("button", { name: "Lock in your pick" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apple" })).toBeDisabled();
  });

  it("shows live percentages, zero-filling candidates nobody picked", () => {
    h.state.optionCounts = { o1: 3, o2: 1 };
    renderContent(slide, "liveResults");

    expect(screen.getByRole("button", { name: /Apple/ })).toHaveTextContent(
      "75%",
    );
    expect(screen.getByRole("button", { name: /Banana/ })).toHaveTextContent(
      "25%",
    );
    expect(screen.getByRole("button", { name: /Cherry/ })).toHaveTextContent(
      "0%",
    );
    // Still answerable while the tally is up.
    expect(
      screen.getByRole("button", { name: "Lock in your pick" }),
    ).toBeInTheDocument();
  });

  it("shows the revealed distribution and marks the most-picked card", () => {
    h.state.results = {
      slideId: "el-1",
      optionCounts: { o1: 1, o2: 3 },
      correctOption: null,
    };
    renderContent(slide, "results");

    expect(screen.getByRole("button", { name: /Banana/ })).toHaveTextContent(
      "Most votes",
    );
    expect(screen.getByRole("button", { name: /Banana/ })).toHaveTextContent(
      "75%",
    );
    expect(screen.getByRole("button", { name: /Apple/ })).not.toHaveTextContent(
      "Most votes",
    );
    // Settled: no submit affordance once results are revealed.
    expect(
      screen.queryByRole("button", { name: /pick/i }),
    ).not.toBeInTheDocument();
  });

  it("marks every tied card when the top count is shared", () => {
    h.state.results = {
      slideId: "el-1",
      optionCounts: { o1: 2, o2: 2 },
      correctOption: null,
    };
    renderContent(slide, "results");

    expect(screen.getAllByText("Most votes")).toHaveLength(2);
  });

  it("ignores a result addressed to another slide", () => {
    h.state.optionCounts = { o1: 5 };
    h.state.results = {
      slideId: "el-9",
      optionCounts: { o1: 5 },
      correctOption: null,
    };
    renderContent(slide, "results");

    expect(screen.queryByText("Most votes")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apple/ })).toHaveTextContent(
      "0%",
    );
  });

  it("re-enables the submit bar when the pick changes after submitting", async () => {
    renderContent();

    await userEvent.click(screen.getByRole("button", { name: "Apple" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Lock in your pick" }),
    );

    expect(screen.getByText("Pick locked in ✓")).toBeInTheDocument();
    const resubmit = screen.getByRole("button", { name: "Change pick" });
    expect(resubmit).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Cherry" }));
    expect(screen.getByRole("button", { name: "Change pick" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Change pick" }));
    expect(h.sendAnswer).toHaveBeenLastCalledWith("el-1", {
      answerType: "FollowUpAnswer",
      optionId: "o3",
    });
  });

  it("renders a placeholder line rather than an empty grid", () => {
    renderContent(emptySlide);

    expect(
      screen.getByText(
        "No answers from the previous question are available to pick from.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
