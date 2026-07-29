// Guards the label fallbacks the boards share: an absent or blank authored
// label must never leave a chip, cell or card nameless, and the fallback index
// the viewer reads is 1-based.
import { describe, it, expect } from "vitest";
import { indexedLabel, labelOrFallback } from "./itemLabels";

describe("labelOrFallback", () => {
  it("uses the authored label, trimmed", () => {
    expect(labelOrFallback("  Mercury  ", "Item")).toBe("Mercury");
  });

  it("falls back when the label is absent", () => {
    expect(labelOrFallback(undefined, "Item")).toBe("Item");
  });

  it("falls back when the label is blank", () => {
    expect(labelOrFallback("   ", "Item")).toBe("Item");
    expect(labelOrFallback("", "Item")).toBe("Item");
  });
});

describe("indexedLabel", () => {
  it("uses the authored label, trimmed", () => {
    expect(indexedLabel(" Agree ", "Statement", 0)).toBe("Agree");
  });

  it("numbers the fallback from one", () => {
    expect(indexedLabel(undefined, "Row", 0)).toBe("Row 1");
    expect(indexedLabel("", "Column", 2)).toBe("Column 3");
    expect(indexedLabel("  ", "Card", 9)).toBe("Card 10");
  });
});
