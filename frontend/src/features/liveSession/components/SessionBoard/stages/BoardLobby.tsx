// Pre-game board state. Shown while the session is still in LOBBY — the host
// hasn't started yet. Kept on the board (rather than only the dedicated lobby
// route) so a projected screen has something meaningful up while players trickle
// in: the room code to join with and a running headcount.
import styles from "./BoardLobby.module.css";

interface BoardLobbyProps {
  /** The public room code participants join with. */
  joinCode: string | null;
  /** Number of participants currently in the room. */
  playerCount: number;
}

const BoardLobby = ({ joinCode, playerCount }: BoardLobbyProps) => (
  <div className={styles.boardLobby}>
    <p className={styles.eyebrow}>Join at the room code</p>
    <p className={styles.code}>{joinCode ?? ""}</p>
    <p className={styles.count}>
      {playerCount === 1 ? "1 player" : `${playerCount.toString()} players`} in
      the room
    </p>
  </div>
);

export { BoardLobby };
