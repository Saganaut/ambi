// Tests for the persistent session header's room-code visibility: it's gated
// on InviteSettings.showRoomCodeInHeader from the live read model, not shown
// unconditionally.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));

vi.mock("@/features/liveSession/hooks/useLiveSessionQuery", () => ({
  useLiveSessionQuery: () => h.query,
}));

import { SessionHeader } from "./SessionHeader";

describe("SessionHeader", () => {
  it("shows the room code when showRoomCodeInHeader is true", () => {
    h.query = {
      roomCode: "ABCD1234",
      showRoomCodeInHeader: true,
      currentSlide: null,
    };

    render(<SessionHeader />);

    expect(screen.getByText("Join code: ABCD1234")).toBeInTheDocument();
  });

  it("hides the room code when showRoomCodeInHeader is false", () => {
    h.query = {
      roomCode: "ABCD1234",
      showRoomCodeInHeader: false,
      currentSlide: null,
    };

    render(<SessionHeader />);

    expect(screen.queryByText(/Join code:/)).not.toBeInTheDocument();
  });

  // ── Round timer (ADR 002) ────────────────────────────────────────────────

  it("shows the frozen remaining time while the timer is paused", () => {
    h.query = {
      currentSlide: null,
      phase: "SUBMIT",
      roundDeadline: "2026-07-01T10:00:30Z",
      timerPausedAt: "2026-07-01T10:00:10Z",
    };

    render(<SessionHeader />);

    // deadline - pausedAt = 20s, frozen — no wall clock involved.
    expect(screen.getByRole("timer")).toHaveTextContent("0:20");
    expect(screen.getByText("paused")).toBeInTheDocument();
  });

  it("shows no timer for an untimed round", () => {
    h.query = {
      currentSlide: null,
      phase: "SUBMIT",
      roundDeadline: null,
      timerPausedAt: null,
    };

    render(<SessionHeader />);

    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("hides the timer once submissions are closed", () => {
    h.query = {
      currentSlide: null,
      phase: "LOCKED",
      roundDeadline: "2026-07-01T10:00:30Z",
      timerPausedAt: null,
    };

    render(<SessionHeader />);

    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });
});
