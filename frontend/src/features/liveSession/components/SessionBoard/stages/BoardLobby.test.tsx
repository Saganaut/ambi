// Tests for the pre-game lobby board: it shows the room code, a join QR that
// encodes the join URL for that code, and a headcount. The QR is only rendered
// once a room code is known (after the snapshot seeds).
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { BoardLobby } from "./BoardLobby";

describe("BoardLobby", () => {
  it("shows the room code and a QR encoding its join URL", () => {
    render(<BoardLobby joinCode={"ABCD1234"} playerCount={2} />);

    expect(screen.getByText("ABCD1234")).toBeInTheDocument();
    // qrcode.react renders an <svg> carrying the title we pass.
    expect(screen.getByTitle("Scan to join the room").closest("svg")).not.toBeNull();
    expect(screen.getByText("2 players in the room")).toBeInTheDocument();
  });

  it("omits the QR before a room code is known", () => {
    render(<BoardLobby joinCode={null} playerCount={1} />);

    expect(screen.queryByTitle("Scan to join the room")).not.toBeInTheDocument();
    expect(screen.getByText("1 player in the room")).toBeInTheDocument();
  });
});
