import { useCurrentUser } from "@auth/hooks/useCurrentUser";
import { CollapseBtn } from "@ui/Buttons/CollapseBtn";
import { useState } from "react";
import { camelToNormalCase } from "../../utils/utils";
import styles from "./PlayerInfo.module.css";

const StatRow = ({ label, stat }: { label: string; stat: number }) => {
  return (
    <div className={styles.statRow}>
      <dt>{camelToNormalCase(label)}</dt>
      <dd>{stat}</dd>
    </div>
  );
};
//TODO: Once we have a player state API we can re-implement this component
const PlayerInfo = () => {
  const userState = useCurrentUser();

  const [isCollapsed, setIsCollapsed] = useState(false);
  if (userState.state === "loading") return <div> Loading...</div>;
  if (userState.state === "error") return <div> Error...</div>;
  if (userState.state === "visitor") return <div> No user </div>;

  if (userState.state !== "registered") {
    return <div className={styles.playerInfoContainer}>No user</div>;
  }
  const user = userState.me;
  // PlayerStats now mixes numeric counters with maps (presentedByKind /
  // correctByKind) and timestamps; the simple StatRow only renders numbers.
  // const statsArray = Object.entries(user.stats ?? {}).filter(
  //   (entry): entry is [string, number] => typeof entry[1] === "number",
  // );
  //TODO: Either save profile images to server or cache google images
  return (
    <div className={styles.playerInfoContainer}>
      <div className={styles.playerInfo}>
        <div className={styles.header}>
          <div className={styles.imgWrapper}>
            {/* <img src={user.pictureUrl} /> */}
            <img src="https://i.pravatar.cc/50" alt={`${user.username} avatar`} />
          </div>
          <div>
            <h5>{user.username}</h5>
            {/* {isRegisteredUser(user) && (
              <>
                <p> {user.name} </p>
                <p> {user.email} </p>{" "}
              </>
            )} */}
            <CollapseBtn collapse={setIsCollapsed} isCollapsed={isCollapsed} />
          </div>
        </div>

        <div className={styles.body}>
          <div className={` ${styles.playerStats} ${isCollapsed ? styles.isCollapsed : ""} `}>
            {/* {statsArray.map(([key, value]) => ( */}
            <StatRow key={"1"} label={"Total Points"} stat={100} />
            {/* ))} */}
          </div>
        </div>
      </div>
    </div>
  );
};

export { PlayerInfo };
