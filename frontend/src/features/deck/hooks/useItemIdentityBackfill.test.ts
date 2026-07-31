import { describe, expect, it } from "vitest";

import { paletteColorAt } from "@/shared/components/Charts/optionPalette";
import { backfillItemIdentity } from "./useItemIdentityBackfill";

describe("backfillItemIdentity", () => {
  it("freezes the current palette colors onto legacy identified items", () => {
    const items = [
      { id: "st_a", label: "First" },
      { id: "st_b", label: "Second" },
    ];

    expect(backfillItemIdentity(items)).toEqual([
      { ...items[0], color: paletteColorAt(0) },
      { ...items[1], color: paletteColorAt(1) },
    ]);
  });

  it("does not request a write when every identity is complete", () => {
    expect(backfillItemIdentity([{ id: "st_a", color: "#ff0000" }])).toBeNull();
  });
});
