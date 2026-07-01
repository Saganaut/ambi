import type { ParticipantView } from "@/features/liveSession/store/liveSessionApi.gen";
import { Avatar } from "@ui/Avatar/Avatar";
import { resolvePlayerAvatarSrc } from "@utils/avatarUrl";
import styles from "./SessionPlayerList.module.css";

interface PlayerListItemInterface {
  participant: ParticipantView;
}

const PlayerListItem = ({ participant }: PlayerListItemInterface) => {
  const name = participant.displayName ?? "Player";
  // ParticipantView carries the built-in avatar id directly (no full Avatar
  // value object); wrap it so the shared resolver can turn it into a src.
  const avatarSrc = resolvePlayerAvatarSrc(
    participant.internalAvatarId
      ? { internalAvatarId: participant.internalAvatarId }
      : undefined,
  );

  return (
    <div className={styles.playerListItem}>
      <div className={styles.name}>
        <Avatar src={avatarSrc} name={name} size='sm' />
        {name}
      </div>
      <div className={styles.score}>{participant.score?.points ?? 0}</div>
    </div>
  );
};

export { PlayerListItem };
