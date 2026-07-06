// Pre-game board state. Shown while the session is still in LOBBY — the host
// hasn't started yet. Kept on the board (rather than only the dedicated lobby
// route) so a projected screen has something meaningful up while players trickle
// in: the room code to join with, a QR that deep-links to the join page, and a
// running headcount. The lobby always shows both — this is the one screen
// whose whole purpose is getting people to join, so it isn't gated by
// InviteSettings the way the header/results surfaces are.
import { JoinInfoDisplay } from "@liveSession/components/JoinInfoDisplay/JoinInfoDisplay";
import styles from "./BoardLobby.module.css";

interface BoardLobbyProps {
  /** The room code participants join with, or `null` before the snapshot seeds. */
  joinCode: string | null;
  /** Number of participants currently in the room. */
  playerCount: number;
}

const BoardLobby = ({ joinCode, playerCount }: BoardLobbyProps) => (
  <div className={styles.boardLobby}>
    <JoinInfoDisplay joinCode={joinCode} />
    <p className={styles.count}>
      {playerCount === 1 ? "1 player" : `${playerCount.toString()} players`} in
      the room
    </p>
  </div>
);

export { BoardLobby };
