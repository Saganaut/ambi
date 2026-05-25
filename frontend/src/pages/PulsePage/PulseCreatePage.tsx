// Pulse create — audience polling entry. Stubbed for now: the Pulse mode
// shares its question shape with games but tracks responses instead of scoring.
// When the backend lands, this page will mirror CreateGamePage's template/custom/auto fork.
import { Link } from "@tanstack/react-router";
import { Btn } from "@/components/Common/Buttons/Btn";
import styles from "./PulseCreatePage.module.css";

const PulseCreatePage = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pulse — Audience Polling</h1>
        <p className={styles.subtitle}>
          Run live polls. Same question types as games, but the focus is on data —
          no scoring, no winners.
        </p>
      </header>

      <section className={styles.comingSoon}>
        <span className={styles.icon} aria-hidden='true'>
          ~
        </span>
        <h2 className={styles.comingTitle}>Coming Soon</h2>
        <p className={styles.comingDesc}>
          Pulse is in design. In the meantime, you can preview the experience by
          creating a regular game — the question UI is shared.
        </p>
        <div className={styles.actions}>
          <Link to='/decks' viewTransition>
            <Btn>Create a Game Instead</Btn>
          </Link>
          <Link to='/' viewTransition>
            <Btn variant='info'>Back to Home</Btn>
          </Link>
        </div>
      </section>
    </div>
  );
};

export { PulseCreatePage };
