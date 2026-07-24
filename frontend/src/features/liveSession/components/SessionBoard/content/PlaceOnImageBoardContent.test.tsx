// Tests for the Place-on-Image board: dropping a single pin on the image
// (normalized, top-left-origin coordinates), locking it in once, the read-only
// projected view, the density scatter aggregated from the quantized "bx,by"
// tally keys, and the results view (revealed target circles + the viewer's own
// outcome, via both the live event copy and the snapshot seam). The session
// connection and the live read model are mocked, with the read model mutable
// per test. jsdom reports zero-size rects and lacks pointer capture, so the
// surface rect is stubbed to a 100×100 box at the origin (pointer coordinates
// then read directly as percentages) and set/hasPointerCapture are stubbed.
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
  placeOnImage: { imageUrl: "https://img.test/map.png" },
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
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => true);
});
afterAll(() => {
  rectSpy.mockRestore();
});

const renderContent = (
  mode: BoardQuestionMode = "prompt",
  interactive = true,
  slideOverride: SlideView = slide,
) => render(<PlaceOnImageBoardContent slide={slideOverride} mode={mode} interactive={interactive} />);

/** The pointer surface — the wrapper around the backing <img>. */
const getSurface = (container: HTMLElement): HTMLElement => {
  const surface = container.querySelector("img")?.parentElement;
  if (!surface) throw new Error("surface not found");
  return surface;
};

/** Press the surface at (x, y) client px (= percent, given the 100×100 rect). */
const placePin = (container: HTMLElement, x: number, y: number) =>
  fireEvent.pointerDown(getSurface(container), { clientX: x, clientY: y, pointerId: 1 });

describe("PlaceOnImageBoardContent placing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
    h.query.placeTargets = null;
  });

  it("drops a pin at the pointer's normalized coords and locks it in", async () => {
    const { container } = renderContent();
    // Nothing placed yet → no pin, and Lock is gated.
    expect(screen.queryByLabelText("Your pin")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock in answer" })).toBeDisabled();

    placePin(container, 30, 40); // 30% across, 40% down → (0.3, 0.4)
    expect(screen.getByLabelText("Your pin")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "PlaceOnImageAnswer",
      x: 0.3,
      y: 0.4,
    });
    expect(screen.getByText("Answer locked in ✓")).toBeInTheDocument();
  });

  it("a fresh press relocates the single pin", () => {
    const { container } = renderContent();

    placePin(container, 10, 10);
    placePin(container, 80, 60);
    const pin = screen.getByLabelText("Your pin");
    expect(pin).toHaveStyle({ left: "80%", top: "60%" });
    // Still one pin, not two.
    expect(screen.getAllByLabelText("Your pin")).toHaveLength(1);
  });

  it("cannot submit again once locked in", async () => {
    const { container } = renderContent();

    placePin(container, 50, 50);
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));
    expect(h.sendAnswer).toHaveBeenCalledTimes(1);

    // The button is gone; a further press on the (frozen) surface does nothing.
    expect(screen.queryByRole("button", { name: "Lock in answer" })).not.toBeInTheDocument();
    placePin(container, 10, 90);
    expect(h.sendAnswer).toHaveBeenCalledTimes(1);
  });

  it("is read-only when not interactive (projected / host view)", () => {
    const { container } = renderContent("prompt", false);

    expect(screen.queryByRole("button", { name: "Lock in answer" })).not.toBeInTheDocument();
    // A press on the projected surface places nothing.
    placePin(container, 50, 50);
    expect(screen.queryByLabelText("Your pin")).not.toBeInTheDocument();
    expect(h.sendAnswer).not.toHaveBeenCalled();
  });

  it("shows an empty state when the slide has no image", () => {
    renderContent("prompt", true, { id: "el-0", contentType: "PLACE_ON_IMAGE", placeOnImage: {} });

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

  it("renders the density scatter from the bucket tally keys", () => {
    h.query.optionCounts = { "5,5": 3, "10,2": 1, "1,1": 0 };
    renderContent("liveResults", false);

    expect(screen.getByLabelText("3 pins")).toBeInTheDocument();
    expect(screen.getByLabelText("1 pins")).toBeInTheDocument();
    // A zero-count bucket doesn't render a dot.
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
    expect(screen.getByText("Your pin landed on target ✓")).toBeInTheDocument();
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

    expect(screen.getByText("Not quite — your pin missed the mark.")).toBeInTheDocument();
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
