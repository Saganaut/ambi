import { useState } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import styles from "./PlayerInfo.module.css";
import { camelToNormalCase } from "../../utils/utils";
import { CollapseBtn } from "../Common/Buttons/CollapseBtn";

const StatRow = ({ label, stat }: { label: string; stat: number }) => {
  return (
    <div className={styles.statRow}>
      <dt>{camelToNormalCase(label)}</dt>
      <dd>{stat}</dd>
    </div>
  );
};

const PlayerInfo = () => {
  const userState = useCurrentUser();

  const [isCollapsed, setIsCollapsed] = useState(false);
  if (userState.state === "loading") return <div> Loading...</div>;
  if (userState.state === "error") return <div> Error...</div>;
  if (userState.state === "visitor") return <div> No user </div>;

  const { user } = userState;
  // PlayerStats now mixes numeric counters with maps (presentedByKind /
  // correctByKind) and timestamps; the simple StatRow only renders numbers.
  const statsArray = Object.entries(user.stats ?? {}).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );
  console.log("user", user);
  //TODO: Either save profile images to server or cache google images
  return (
    <div className={styles.playerInfoContainer}>
      <div className={styles.playerInfo}>
        <div className={styles.header}>
          <div className={styles.imgWrapper}>
            {/* <img src={user.pictureUrl} /> */}
            <img src='https://i.pravatar.cc/50' alt={`${user.userName} avatar`} />
          </div>
          <div>
            <h5>{user.userName}</h5>
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
          <div
            className={` ${styles.playerStats} ${isCollapsed ? styles.isCollapsed : ""} `}>
            {statsArray.map(([key, value]) => (
              <StatRow key={key} label={key} stat={value} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { PlayerInfo };
