import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relativeTime";

describe("formatRelativeTime", () => {
  const now = new Date("2026-01-10T12:00:00Z");

  it("formats sub-minute deltas in seconds", () => {
    expect(formatRelativeTime("2026-01-10T11:59:30Z", now)).toBe(
      "30 seconds ago",
    );
  });

  it("formats minutes", () => {
    expect(formatRelativeTime("2026-01-10T11:15:00Z", now)).toBe(
      "45 minutes ago",
    );
  });

  it("formats hours", () => {
    expect(formatRelativeTime("2026-01-10T10:00:00Z", now)).toBe(
      "2 hours ago",
    );
  });

  it("uses natural wording for the previous day", () => {
    expect(formatRelativeTime("2026-01-09T11:00:00Z", now)).toBe("yesterday");
  });

  it("formats weeks", () => {
    expect(formatRelativeTime("2025-12-27T12:00:00Z", now)).toBe(
      "2 weeks ago",
    );
  });

  it("formats years", () => {
    expect(formatRelativeTime("2023-01-10T12:00:00Z", now)).toBe(
      "3 years ago",
    );
  });

  it("handles future timestamps", () => {
    expect(formatRelativeTime("2026-01-10T14:00:00Z", now)).toBe("in 2 hours");
  });

  it("accepts Date objects", () => {
    expect(formatRelativeTime(new Date("2026-01-10T09:00:00Z"), now)).toBe(
      "3 hours ago",
    );
  });
});
