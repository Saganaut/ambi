// Guards the tally aggregation every placement board shares: that a live
// `itemId@suffix` histogram collapses onto the right cell / slot, and that the
// junk a board must never render — keys with no suffix, non-integer or
// out-of-range slots, zero and negative counts — is dropped rather than shaded.
import { describe, it, expect } from "vitest";
import {
  AXIS_TALLY_BUCKETS,
  PLACE_TALLY_BUCKETS,
  parseBucketKey,
  tallyTotalsByBucket,
  tallyTotalsBySlot,
} from "./answerTally";

describe("tallyTotalsByBucket", () => {
  it("collapses every item that landed on the same cell into one total", () => {
    expect(
      tallyTotalsByBucket({ "item-a@1,2": 3, "item-b@1,2": 4, "item-a@0,0": 1 }),
    ).toEqual({ "1,2": 7, "0,0": 1 });
  });

  it("ignores keys carrying no separator", () => {
    expect(tallyTotalsByBucket({ "option-1": 5, "item-a@1,2": 2 })).toEqual({ "1,2": 2 });
  });

  it("ignores keys whose suffix is empty", () => {
    expect(tallyTotalsByBucket({ "item-a@": 5 })).toEqual({});
  });

  it("ignores zero and negative counts", () => {
    expect(tallyTotalsByBucket({ "item-a@1,1": 0, "item-b@2,2": -3, "item-c@3,3": 1 })).toEqual({
      "3,3": 1,
    });
  });

  it("is empty for an empty tally", () => {
    expect(tallyTotalsByBucket({})).toEqual({});
  });
});

describe("tallyTotalsBySlot", () => {
  it("indexes each item's votes by slot, zero-filling the untouched ones", () => {
    expect(tallyTotalsBySlot({ "item-a@0": 2, "item-a@2": 5 }, 4)).toEqual({
      "item-a": [2, 0, 5, 0],
    });
  });

  it("keeps each item's slots separate", () => {
    expect(tallyTotalsBySlot({ "item-a@1": 2, "item-b@1": 3 }, 2)).toEqual({
      "item-a": [0, 2],
      "item-b": [0, 3],
    });
  });

  it("omits an item with no votes entirely", () => {
    expect(tallyTotalsBySlot({ "item-a@0": 1 }, 3)["item-b"]).toBeUndefined();
  });

  it("ignores keys carrying no separator", () => {
    expect(tallyTotalsBySlot({ "item-a": 4 }, 3)).toEqual({});
  });

  it("ignores a non-integer slot", () => {
    expect(tallyTotalsBySlot({ "item-a@1.5": 4, "item-a@x": 4 }, 3)).toEqual({});
  });

  it("ignores slots outside the range", () => {
    expect(tallyTotalsBySlot({ "item-a@3": 4, "item-a@-1": 4 }, 3)).toEqual({});
  });

  it("ignores zero and negative counts", () => {
    expect(tallyTotalsBySlot({ "item-a@0": 0, "item-b@1": -2 }, 3)).toEqual({});
  });

  it("is empty when there are no slots to index into", () => {
    expect(tallyTotalsBySlot({ "item-a@0": 4 }, 0)).toEqual({});
  });
});

describe("parseBucketKey", () => {
  it("decodes a bucket pair", () => {
    expect(parseBucketKey("3,7")).toEqual({ bucketX: 3, bucketY: 7 });
  });

  it("decodes the origin", () => {
    expect(parseBucketKey("0,0")).toEqual({ bucketX: 0, bucketY: 0 });
  });

  it("rejects a single coordinate", () => {
    expect(parseBucketKey("3")).toBeNull();
  });

  it("rejects non-integer coordinates", () => {
    expect(parseBucketKey("1.5,2")).toBeNull();
    expect(parseBucketKey("a,2")).toBeNull();
    expect(parseBucketKey("1,2.5")).toBeNull();
  });

  it("rejects an empty key", () => {
    expect(parseBucketKey("")).toBeNull();
  });
});

describe("mirrored bucket resolutions", () => {
  it("keeps the axis/scales and place-on-image grids at the backend's values", () => {
    expect(AXIS_TALLY_BUCKETS).toBe(10);
    expect(PLACE_TALLY_BUCKETS).toBe(20);
  });
});
