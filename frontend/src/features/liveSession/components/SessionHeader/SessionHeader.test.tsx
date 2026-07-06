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
});
