import { describe, expect, it } from "vitest";

import { wordFrequencies } from "./words";

describe("wordFrequencies", () => {
  it("counts words across texts, ranked by frequency then alphabetically", () => {
    const data = wordFrequencies([
      "Will the roadmap ship this year?",
      "Roadmap questions: is the roadmap public?",
    ]);

    expect(data[0]).toMatchObject({ id: "roadmap", value: 3 });
    const ids = data.map((d) => d.id);
    expect(ids).toContain("ship");
    expect(ids).toContain("public");
  });

  it("drops stopwords and single letters, lowercases, keeps inner apostrophes", () => {
    const data = wordFrequencies(["Why DON'T we A/B test it?"]);

    const ids = data.map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(["don't", "test"]));
    expect(ids).not.toContain("why"); // stopword
    expect(ids).not.toContain("it"); // stopword
    expect(ids).not.toContain("a"); // single letter
  });

  it("caps the list at the requested rank", () => {
    const texts = Array.from({ length: 30 }, (_, i) => `word${i.toString()} filler`);

    expect(wordFrequencies(texts, 5)).toHaveLength(5);
  });

  it("returns empty for empty or all-stopword input", () => {
    expect(wordFrequencies([])).toEqual([]);
    expect(wordFrequencies(["and or but the"])).toEqual([]);
  });
});
