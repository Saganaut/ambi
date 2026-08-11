// Covers Place-on-Image-specific placement wiring, empty-image rendering, density scatter,
// revealed target rendering, snapshot fallback, authored marker identity, and scoring.
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { paletteColorAt } from "@/shared/components/Charts/optionPalette";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";

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
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: chip }));
  await user.pointer({
    target: screen.getByRole("button", { name: "Place on the image" }),
    coords: { clientX, clientY },
    keys: "[MouseLeft]",
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
    await place("Heart", 30, 40);
    await place("Lungs", 70, 25);
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "PlaceOnImageAnswer",
      placements: { heart: { x: 0.3, y: 0.4 }, lungs: { x: 0.7, y: 0.25 } },
    });
    expect(screen.getByText("Answer locked in ✓")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lock in answer" })).not.toBeInTheDocument();
  });

  it("renders the projected image without participant controls", () => {
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
      placeTargets: [{ itemId: "heart", x: 0.5, y: 0.5, radius: 0.1 }],
      terminal: false,
    };
    renderContent("results", false);

    // The reveal carries geometry only — the label comes off the authored item.
    expect(screen.getByText("Heart")).toBeInTheDocument();
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
    h.query.placeTargets = [{ itemId: "heart", x: 0.25, y: 0.75, radius: 0.15 }];
    renderContent("results", false);

    expect(screen.getByText("Heart")).toBeInTheDocument();
  });

  it("numbers a revealed circle by its item's AUTHORED position, not the reveal's", () => {
    // Only the second item is keyed, so the single revealed circle must read 2
    // (with item 2's palette color) — numbering off the reveal list said 1.
    h.query.placeTargets = [{ itemId: "lungs", x: 0.5, y: 0.5, radius: 0.1 }];
    renderContent("results", false);

    expect(screen.getByText("Lungs")).toBeInTheDocument();
    const disc = screen.getByText("2");
    expect(disc.parentElement?.style.getPropertyValue("--marker-badge-color")).toBe(
      paletteColorAt(1),
    );
  });

  it("draws nothing for a target naming no authored item", () => {
    h.query.placeTargets = [{ itemId: "spleen", x: 0.5, y: 0.5, radius: 0.1 }];
    renderContent("results", false);

    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});
