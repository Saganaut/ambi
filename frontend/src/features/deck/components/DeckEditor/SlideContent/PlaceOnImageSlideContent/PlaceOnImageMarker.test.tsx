// Covers Place-on-Image marker positioning, labeling, and circular tolerance sizing.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlaceOnImageMarker } from "./PlaceOnImageMarker";

describe("PlaceOnImageMarker", () => {
  it("renders a circular tolerance region at the normalized target point", () => {
    const { container } = render(
      <PlaceOnImageMarker
        point={{ x: 0.25, y: 0.75 }}
        target={{ id: "target-1", x: 0.25, y: 0.75, label: "North gate" }}
        index={0}
        tolerance={0.1}
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
