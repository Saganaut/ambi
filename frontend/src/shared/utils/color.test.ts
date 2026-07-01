import { describe, expect, it } from "vitest";
import { contrastToneFor } from "./color";

describe("contrastToneFor", () => {
  it("picks dark text on light backgrounds", () => {
    expect(contrastToneFor("#ffffff")).toBe("dark");
    expect(contrastToneFor("#f5f5f4")).toBe("dark"); // near-white deck default
    expect(contrastToneFor("#fef3c7")).toBe("dark"); // pale amber
  });

  it("picks light text on dark backgrounds", () => {
    expect(contrastToneFor("#000000")).toBe("light");
    expect(contrastToneFor("#1e293b")).toBe("light"); // slate-800 background swatch
    expect(contrastToneFor("#475569")).toBe("light"); // slate-600 background swatch
  });

  it("handles shorthand hex", () => {
    expect(contrastToneFor("#fff")).toBe("dark");
    expect(contrastToneFor("#000")).toBe("light");
  });

  it("ignores the alpha channel", () => {
    expect(contrastToneFor("#ffffff80")).toBe("dark");
    expect(contrastToneFor("#000f")).toBe("light");
  });

  it("falls back to dark text for unparseable input", () => {
    expect(contrastToneFor("")).toBe("dark");
    expect(contrastToneFor("rgb(0,0,0)")).toBe("dark");
    expect(contrastToneFor("#12")).toBe("dark");
  });
});
