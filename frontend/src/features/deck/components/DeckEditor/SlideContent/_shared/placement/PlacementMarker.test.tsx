// Covers placement-marker positioning, the labeled variant's disc-anchoring
// offset, and circular tolerance sizing.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlacementMarker } from "./PlacementMarker";

describe("PlacementMarker", () => {
  it("renders a circular tolerance region at the normalized target point", () => {
    const { container } = render(
      <PlacementMarker
        point={{ x: 0.25, y: 0.75 }}
        color="oklch(0.65 0.4 290)"
        displayIndex={1}
        label="North gate"
        tolerance={0.1}
        ariaLabel="Target 1 (North gate) — drag to move"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Target 1 (North gate) — drag to move" }),
    ).toHaveStyle({
      left: "25%",
      top: "75%",
    });

    const toleranceRegion = container.firstElementChild?.firstElementChild;
    expect(toleranceRegion).toHaveStyle({
      left: "25%",
      top: "75%",
      width: "20%",
      aspectRatio: "1",
    });
    expect(toleranceRegion).not.toHaveStyle({ height: "20%" });
  });

  // The badge draws itself as a pill once it has a label, which pushes its disc
  // off to the leading edge; only the labeled variant carries the class that
  // offsets the marker back so the disc stays on the graded point.
  it("offsets a labeled marker so the badge's disc keeps the point", () => {
    render(
      <PlacementMarker
        point={{ x: 0.5, y: 0.5 }}
        color="oklch(0.65 0.4 290)"
        displayIndex={1}
        label="North gate"
        ariaLabel="Target 1 (North gate) — drag to move"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Target 1 (North gate) — drag to move" }).className,
    ).toContain("anchoredLabeled");
  });

  it("centres an unlabeled marker's bare disc on the point", () => {
    render(
      <PlacementMarker
        point={{ x: 0.5, y: 0.5 }}
        color="oklch(0.65 0.4 290)"
        displayIndex={1}
        ariaLabel="Target 1 — drag to move"
      />,
    );

    expect(screen.getByRole("button", { name: "Target 1 — drag to move" }).className).not.toContain(
      "anchoredLabeled",
    );
  });
});
