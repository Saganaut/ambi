// Covers Axis-specific placement wiring, authored marker rendering, plane chrome,
// heat aggregation, and scored outcome integration.
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { AxisBoardContent } from "./AxisBoardContent";
// The plane's chrome carries no accessible handle (it is decoration), so the
// few structural assertions below reach it by its own generated class names.
import styles from "./AxisBoardContent.module.css";

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

/** Same shape, every endpoint label left unset — the fallbacks then show. */
const unlabeledSlide: SlideView = {
  id: "el-1",
  contentType: "AXIS",
  axis: { items: [{ id: "sam", label: "Samwise" }] },
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
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: chip }));
  await user.pointer({
    target: screen.getByRole("button", { name: "Place on the plane" }),
    coords: { clientX, clientY },
    keys: "[MouseLeft]",
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
    await place("Samwise", 20, 75);
    await place("Boromir", 70, 25);
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "AxisAnswer",
      placements: { sam: { x: 0.2, y: 0.25 }, bor: { x: 0.7, y: 0.75 } },
    });
    expect(screen.getByRole("button", { name: "Update answer" })).toBeEnabled();
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

  it("renders the projected plane without participant controls", () => {
    renderContent("prompt", false);

    expect(screen.queryByRole("button", { name: "Submit answer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Samwise" })).not.toBeInTheDocument();
  });
});

describe("AxisBoardContent plane chrome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("quarters the plane with the two decorative axis lines", () => {
    const { container } = renderContent();

    const plane = container.querySelector<HTMLElement>(`.${styles.plane}`);
    const lineX = plane?.querySelector<HTMLElement>(`.${styles.planeAxisLineX}`) ?? null;
    const lineY = plane?.querySelector<HTMLElement>(`.${styles.planeAxisLineY}`) ?? null;

    // Pure decoration: inside the plane, and hidden from assistive tech.
    expect(lineX).toHaveAttribute("aria-hidden", "true");
    expect(lineY).toHaveAttribute("aria-hidden", "true");
  });

  it("overlays the four configured endpoint labels inside the plane", () => {
    const { container } = renderContent();

    const plane = container.querySelector<HTMLElement>(`.${styles.plane}`);
    for (const label of ["Proud", "Humble", "Cautious", "Reckless"]) {
      expect(plane).toContainElement(screen.getByText(label));
    }
  });

  it("falls back to Low / High for the endpoints an author left unset", () => {
    render(<AxisBoardContent slide={unlabeledSlide} mode="prompt" interactive />);

    // Both low ends and both high ends, one pill each.
    expect(screen.getAllByText("Low")).toHaveLength(2);
    expect(screen.getAllByText("High")).toHaveLength(2);
  });

  it("keeps the labels on the projected view, where nothing is answerable", () => {
    const { container } = renderContent("prompt", false);

    const plane = container.querySelector<HTMLElement>(`.${styles.plane}`);
    expect(plane).toContainElement(screen.getByText("Proud"));
    expect(plane?.querySelector(`.${styles.planeAxisLineX}`)).toBeInTheDocument();
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
