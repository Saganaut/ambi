// Tests for the end-of-session standings board: it always ranks and lists the
// final scoreboard, and conditionally shows the join QR + room code per
// InviteSettings.showJoinInfoInResults.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { ScoreboardEntry } from "../../../store/liveSessionApi.gen";
import { BoardOverallResults } from "./BoardOverallResults";

const standings: ScoreboardEntry[] = [
  { participantId: "p1", displayName: "Alpha", points: 100, rank: 1 },
  { participantId: "p2", displayName: "Bravo", points: 50, rank: 2 },
];

describe("BoardOverallResults", () => {
  it("shows join info when showJoinInfo is true", () => {
    render(
      <BoardOverallResults
        standings={standings}
        joinCode={"ABCD1234"}
        showJoinInfo={true}
      />,
    );

    expect(screen.getByText("ABCD1234")).toBeInTheDocument();
  });

  it("omits join info when showJoinInfo is false", () => {
    render(
      <BoardOverallResults
        standings={standings}
        joinCode={"ABCD1234"}
        showJoinInfo={false}
      />,
    );

    expect(screen.queryByText("ABCD1234")).not.toBeInTheDocument();
  });
});
