// Route shell for /games/join — renders page chrome (title, subtitle, back
// link) and embeds the reusable JoinWithCode form. Form state, the join
// mutation, and lobby navigation all live in JoinWithCode so other surfaces
// can drop it in without duplicating logic.
import { Link } from "@tanstack/react-router";
import { JoinWithCode } from "@/components/Games/JoinWithCode/JoinWithCode";
import styles from "./GameHub.module.css";

const JoinGamePage = () => {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Join Game</h1>
      <p className={styles.subtitle}>
        Enter the 6-character room code from your host.
      </p>

      <JoinWithCode />

      <Link to='/' className={styles.backLink} viewTransition>
        Back to home
      </Link>
    </div>
  );
};

export { JoinGamePage };
