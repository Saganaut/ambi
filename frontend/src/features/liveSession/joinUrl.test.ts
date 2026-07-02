// Tests for the join-URL builder: the code lands in the `code` query param,
// is URL-encoded, and the origin defaults to the current window when omitted.
import { describe, expect, it } from "vitest";

import { buildJoinUrl } from "./joinUrl";

describe("buildJoinUrl", () => {
  it("builds a join URL with the code as a query param", () => {
    expect(buildJoinUrl("ABCD1234", "https://app.example.com")).toBe(
      "https://app.example.com/join?code=ABCD1234",
    );
  });

  it("URL-encodes the room code", () => {
    expect(buildJoinUrl("A B&C", "https://app.example.com")).toBe(
      "https://app.example.com/join?code=A%20B%26C",
    );
  });

  it("falls back to window.location.origin when no origin is given", () => {
    expect(buildJoinUrl("XYZ")).toBe(
      `${window.location.origin}/join?code=XYZ`,
    );
  });
});
