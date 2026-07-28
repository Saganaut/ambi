// Tests for the Axis board: tap-to-select from the bank + tap-at-point-to-place
// on the plane (normalized, y-inverted coordinates), the numbered MarkerBadge
// chips, submit gated on all items placed, resubmit-until-lock, pick-back-up,
// arrow-key nudging, the 10×10 heat aggregation from the quantized itemId@bx,by
// tally keys, and the read-only projected view. The session connection and the
// live read model are mocked, with the read model mutable per test. jsdom
// reports zero-size rects, so the plane's rect is stubbed to a 100×100 box at
// the origin — tap coordinates then read directly as percentages. (Drag is
// dnd-kit's primary path but isn't exercised in jsdom; the tap fallback drives
// the same placement state, mirroring the Place-on-Image board's test.)
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../resolveBoardStage";

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

import { AxisBoardContent } from "./AxisBoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "AXIS",
  axis: {
    xLowLabel: "Cautious",
    xHighLabel: "Reckless",
    yLowLabel: "Humble",
    yHighLabel: "Proud",
    items: [
      { id: "sam", label: "Samwise" },
      { id: "bor", label: "Boromir" },
    ],
  },
};

const RECT = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
  toJSON: () => ({}),
} as DOMRect;

let rectSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(RECT);
});
afterAll(() => {
  rectSpy.mockRestore();
});

const renderContent = (mode: BoardQuestionMode = "prompt", interactive = true) =>
  render(<AxisBoardContent slide={slide} mode={mode} interactive={interactive} />);

/** Pick `chip` from the bank, then tap the plane at (clientX, clientY). */
const place = async (chip: string, clientX: number, clientY: number) => {
  await userEvent.click(screen.getByRole("button", { name: chip }));
  fireEvent.click(screen.getByRole("button", { name: "Place on the plane" }), {
    clientX,
    clientY,
  });
};

describe("AxisBoardContent placing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("places items at the tap's normalized, y-inverted coordinates and submits the map", async () => {
    renderContent();
    // Nothing held yet → no plane tap target, and Submit is gated.
    expect(
      screen.queryByRole("button", { name: "Place on the plane" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();

    await place("Samwise", 20, 75); // 20% across, 75% down → (0.2, 0.25)
    await place("Boromir", 70, 25); // → (0.7, 0.75)
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "AxisAnswer",
      placements: { sam: { x: 0.2, y: 0.25 }, bor: { x: 0.7, y: 0.75 } },
    });
  });

  it("chips carry the item's AUTHORED number beside its label", async () => {
    renderContent();

    // The bank is shuffled, but the badge numbers follow the authored order.
    expect(screen.getByRole("button", { name: "Samwise" })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Boromir" })).toHaveTextContent("2");

    // The number travels with the item onto the plane.
    await place("Samwise", 20, 75);
    expect(screen.getByRole("button", { name: /Pick Samwise back up/ })).toHaveTextContent(
      "1",
    );
  });

  it("submit stays gated until every item is placed", async () => {
    renderContent();

    await place("Samwise", 50, 50);

    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();
    expect(h.sendAnswer).not.toHaveBeenCalled();
  });

  it("a placed chip can be picked back up and re-placed", async () => {
    renderContent();

    await place("Samwise", 20, 75);
    await userEvent.click(screen.getByRole("button", { name: /Pick Samwise back up/ }));
    fireEvent.click(screen.getByRole("button", { name: "Place on the plane" }), {
      clientX: 60,
      clientY: 50,
    });
    await place("Boromir", 70, 25);
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "AxisAnswer",
      placements: { sam: { x: 0.6, y: 0.5 }, bor: { x: 0.7, y: 0.75 } },
    });
  });

  it("allows resubmitting an adjusted map until the round locks", async () => {
    renderContent();

    await place("Samwise", 20, 75);
    await place("Boromir", 70, 25);
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(screen.getByText("Answer submitted ✓")).toBeInTheDocument();

    // The surface stays live after submitting: adjust one chip and re-send.
    await userEvent.click(screen.getByRole("button", { name: /Pick Boromir back up/ }));
    fireEvent.click(screen.getByRole("button", { name: "Place on the plane" }), {
      clientX: 10,
      clientY: 25,
    });
    await userEvent.click(screen.getByRole("button", { name: "Update answer" }));

    expect(h.sendAnswer).toHaveBeenCalledTimes(2);
    expect(h.sendAnswer).toHaveBeenLastCalledWith("el-0", {
      answerType: "AxisAnswer",
      placements: { sam: { x: 0.2, y: 0.25 }, bor: { x: 0.1, y: 0.75 } },
    });
  });

  it("arrow keys nudge a focused placed chip in 2% steps", async () => {
    renderContent();

    await place("Samwise", 50, 50);
    const chip = screen.getByRole("button", { name: /Pick Samwise back up/ });
    fireEvent.keyDown(chip, { key: "ArrowRight" });
    fireEvent.keyDown(chip, { key: "ArrowUp" });
    await place("Boromir", 70, 25);
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "AxisAnswer",
      placements: {
        sam: { x: expect.closeTo(0.52, 10) as number, y: expect.closeTo(0.52, 10) as number },
        bor: { x: 0.7, y: 0.75 },
      },
    });
  });

  it("is read-only when not interactive (projected / host view)", () => {
    renderContent("prompt", false);

    expect(screen.queryByRole("button", { name: "Submit answer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Samwise" })).not.toBeInTheDocument();
  });
});

describe("AxisBoardContent results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Two items in one bucket, one in another, and a reconciled-away zero.
    h.query.optionCounts = { "sam@2,1": 3, "bor@2,1": 1, "bor@8,3": 2, "sam@5,5": 0 };
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("sums the itemId@bx,by tally into per-bucket heat once revealed", () => {
    renderContent("liveResults");

    // Bucket 2,1 holds sam(3)+bor(1)=4; 8,3 holds 2; zero-count keys don't render.
    expect(screen.getByLabelText("4 placements")).toBeInTheDocument();
    expect(screen.getByLabelText("2 placements")).toBeInTheDocument();
    expect(screen.queryByLabelText("0 placements")).not.toBeInTheDocument();
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

    expect(screen.getByText("You placed everything on target ✓")).toBeInTheDocument();
  });
});
