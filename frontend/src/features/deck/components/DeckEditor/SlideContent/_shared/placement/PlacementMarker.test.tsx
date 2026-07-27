// Covers placement-marker positioning, labeling, and circular tolerance sizing.
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
});
