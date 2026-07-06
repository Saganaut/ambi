// Shared QR + room-code join affordance. Rendered unconditionally by BoardLobby
// and conditionally (per InviteSettings.showJoinInfoInResults) by
// BoardOverallResults — any surface where a participant might want to join or
// rejoin the room.
import { QRCodeSVG } from "qrcode.react";

import { buildJoinUrl } from "@liveSession/joinUrl";
import styles from "./JoinInfoDisplay.module.css";

interface JoinInfoDisplayProps {
  /** The room code participants join with, or `null` before the snapshot seeds. */
  joinCode: string | null;
  /** Eyebrow copy above the code — defaults to the lobby's phrasing. */
  eyebrow?: string;
}

const JoinInfoDisplay = ({
  joinCode,
  eyebrow = "Join at the room code",
}: JoinInfoDisplayProps) => (
  <div className={styles.joinInfoDisplay}>
    <p className={styles.eyebrow}>{eyebrow}</p>
    <p className={styles.code}>{joinCode ?? ""}</p>
    {joinCode != null && (
      <QRCodeSVG
        className={styles.qr}
        value={buildJoinUrl(joinCode)}
        title={"Scan to join the room"}
        marginSize={2}
      />
    )}
  </div>
);

export { JoinInfoDisplay };
