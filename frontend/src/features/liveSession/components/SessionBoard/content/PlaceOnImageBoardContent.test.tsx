// Tests for the Place-on-Image board: placing one pin per authored item onto
// the image via the tap fallback (tap a bank chip, then tap the image at a
// point — normalized, top-left-origin coordinates), submit gated on every item
// placed, locking the whole placement map once, pick-back-up, the read-only
// projected view, the density scatter aggregated from the quantized
// `itemId@bx,by` tally keys, and the results view (revealed target circles + the
// viewer's own outcome, via both the live event copy and the snapshot seam).
// The session connection and the live read model are mocked, mutable per test.
// jsdom reports zero-size rects, so the surface rect is stubbed to a 100×100 box
// at the origin — tap coordinates then read directly as percentages. (Drag is
// dnd-kit's primary path but isn't exercised in jsdom; the tap fallback drives
// the same placement state, mirroring the Grid board's test.)
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
    placeTargets: null as unknown,
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

import { PlaceOnImageBoardContent } from "./PlaceOnImageBoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "PLACE_ON_IMAGE",
  placeOnImage: {
    imageUrl: "https://img.test/map.png",
    items: [
      { id: "heart", label: "Heart" },
      { id: "lungs", label: "Lungs" },
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

const renderContent = (
  mode: BoardQuestionMode = "prompt",
  interactive = true,
  slideOverride: SlideView = slide,
) => render(<PlaceOnImageBoardContent slide={slideOverride} mode={mode} interactive={interactive} />);

/** Pick `chip` from the bank, then tap the image at (clientX, clientY). */
const place = async (chip: string, clientX: number, clientY: number) => {
  await userEvent.click(screen.getByRole("button", { name: chip }));
  fireEvent.click(screen.getByRole("button", { name: "Place on the image" }), {
    clientX,
    clientY,
  });
};

describe("PlaceOnImageBoardContent placing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
    h.query.placeTargets = null;
  });

  it("places one pin per item at the tap's normalized coords and locks the map", async () => {
    renderContent();
    // Nothing held yet → no image tap target, and Lock is gated.
    expect(
      screen.queryByRole("button", { name: "Place on the image" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock in answer" })).toBeDisabled();

    await place("Heart", 30, 40); // 30% across, 40% down → (0.3, 0.4)
    await place("Lungs", 70, 25); // → (0.7, 0.25)
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "PlaceOnImageAnswer",
      placements: { heart: { x: 0.3, y: 0.4 }, lungs: { x: 0.7, y: 0.25 } },
    });
    expect(screen.getByText("Answer locked in ✓")).toBeInTheDocument();
  });

  it("lock stays gated until every item is placed", async () => {
    renderContent();

    await place("Heart", 50, 50);

    expect(screen.getByRole("button", { name: "Lock in answer" })).toBeDisabled();
    expect(h.sendAnswer).not.toHaveBeenCalled();
  });

  it("a placed pin can be picked back up and re-placed", async () => {
    renderContent();

    await place("Heart", 20, 20);
    await userEvent.click(screen.getByRole("button", { name: /Pick Heart back up/ }));
    fireEvent.click(screen.getByRole("button", { name: "Place on the image" }), {
      clientX: 60,
      clientY: 50,
    });
    await place("Lungs", 70, 25);
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "PlaceOnImageAnswer",
      placements: { heart: { x: 0.6, y: 0.5 }, lungs: { x: 0.7, y: 0.25 } },
    });
  });

  it("cannot submit again once locked in", async () => {
    renderContent();

    await place("Heart", 30, 40);
    await place("Lungs", 70, 25);
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));
    expect(h.sendAnswer).toHaveBeenCalledTimes(1);

    // The bank and lock button are gone; the surface is frozen.
    expect(screen.queryByRole("button", { name: "Lock in answer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Heart" })).not.toBeInTheDocument();
  });

  it("is read-only when not interactive (projected / host view)", () => {
    renderContent("prompt", false);

    expect(screen.queryByRole("button", { name: "Lock in answer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Heart" })).not.toBeInTheDocument();
  });

  it("shows an empty state when the slide has no image", () => {
    renderContent("prompt", true, {
      id: "el-0",
      contentType: "PLACE_ON_IMAGE",
      placeOnImage: { items: [{ id: "heart", label: "Heart" }] },
    });

    expect(screen.getByText("No image was set for this slide.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lock in answer" })).not.toBeInTheDocument();
  });
});

describe("PlaceOnImageBoardContent results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
    h.query.placeTargets = null;
  });

  it("sums the itemId@bx,by tally into a per-bucket density scatter", () => {
    // Two items in one bucket, one in another, and a reconciled-away zero.
    h.query.optionCounts = { "heart@5,5": 3, "lungs@5,5": 1, "lungs@10,2": 2, "heart@1,1": 0 };
    renderContent("liveResults", false);

    // Bucket 5,5 holds heart(3)+lungs(1)=4; 10,2 holds 2; zero-count keys don't render.
    expect(screen.getByLabelText("4 pins")).toBeInTheDocument();
    expect(screen.getByLabelText("2 pins")).toBeInTheDocument();
    expect(screen.queryByLabelText("0 pins")).not.toBeInTheDocument();
  });

  it("reveals the authored targets and the viewer's outcome at results", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [{ participantId: "p-me", choice: null, correct: true, points: 10, responseTimeMs: 5 }],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      drawings: null,
      placeTargets: [{ id: "t1", x: 0.5, y: 0.5, radius: 0.1, label: "Middle", color: "#abcabc" }],
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.getByText("Middle")).toBeInTheDocument();
    expect(screen.getByText("You placed everything on target ✓")).toBeInTheDocument();
  });

  it("banners a missed outcome", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [{ participantId: "p-me", choice: null, correct: false, points: 0, responseTimeMs: 5 }],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      drawings: null,
      placeTargets: [],
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.getByText("Not quite — some pins missed the mark.")).toBeInTheDocument();
  });

  it("falls back to the snapshot targets for a late joiner (no RoundResults)", () => {
    // A client that joined mid-reveal has results === null but the snapshot
    // seeded placeTargets — the component must still disclose them.
    h.query.results = null;
    h.query.placeTargets = [{ id: "t1", x: 0.25, y: 0.75, radius: 0.15, label: "Corner" }];
    renderContent("results", false);

    expect(screen.getByText("Corner")).toBeInTheDocument();
  });
});
