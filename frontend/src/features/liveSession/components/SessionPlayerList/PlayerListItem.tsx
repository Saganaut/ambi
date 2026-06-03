import { type InteractiveSessionPlayerResponse } from "@store/AmbiApi";
import { Avatar } from "@common/Avatar/Avatar";
import { resolvePlayerAvatarSrc } from "@utils/avatarUrl";
import styles from "./SessionPlayerList.module.css";

interface PlayerListItemInterface {
  player: InteractiveSessionPlayerResponse;
}

const PlayerListItem = ({ player }: PlayerListItemInterface) => {
  return (
    <div className={styles.playerListItem}>
      <div className={styles.name}>
        <Avatar
          src={resolvePlayerAvatarSrc(player.avatar)}
          name={player.user.name}
          size='sm'
        />
        {player.user.name}
      </div>
      <div className={styles.score}>{player.score}</div>
    </div>
  );
};

export { PlayerListItem };
