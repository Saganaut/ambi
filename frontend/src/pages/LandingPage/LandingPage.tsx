import { useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Route as IndexRoute } from "../../routes/index";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import styles from "./LandingPage.module.css";

const FEATURES = [
  {
    icon: "⚡",
    title: "Compete in Real Time",
    desc: "Race against players worldwide in fast-paced mental challenges. Every second counts.",
  },
  {
    icon: "🧠",
    title: "Train Your Mind",
    desc: "Daily puzzles, pattern recognition, and memory drills that adapt to your skill level.",
  },
  {
    icon: "🏆",
    title: "Climb the Ranks",
    desc: "A global leaderboard tracks your total points, streaks, and highest scores.",
  },
];

const STATS = [
  { number: "10K+", label: "Active Players" },
  { number: "50+", label: "Brain Games" },
  { number: "Daily", label: "Challenges" },
];

const LandingPage = () => {
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";
  const { authPrompt, returnUrl } = IndexRoute.useSearch();
  const { openLoginModal } = useRequireLogin();
  const navigate = useNavigate();
  const hasPromptedRef = useRef(false);

  // "/" is the public home, but a registered user has no use for the marketing
  // page — send them straight to their workspace. Visitors and guests stay and
  // see the product below. This also means logging in from home (returnUrl="/")
  // resolves to /decks once the session flips to registered, while a deep
  // protected path is preserved as-is.
  useEffect(() => {
    if (userState.state !== "registered") return;
    void navigate({ to: "/decks", replace: true });
  }, [userState.state, navigate]);

  // The /_authenticated gate bounces unauthenticated users here with
  // `?authPrompt=true&returnUrl=<blocked path>`. Surface the sign-in modal
  // pre-loaded with that destination, then strip the params so a refresh or
  // back-nav doesn't reopen it. A plain first-time visit carries no params,
  // so nothing pops — the visitor just browses the product.
  useEffect(() => {
    if (!authPrompt) return;
    if (isRegistered) return;
    if (userState.state === "loading") return;
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;

    openLoginModal({
      returnUrl,
      message: "Sign in to continue to that page.",
    });
    void navigate({
      to: "/",
      search: { authPrompt: undefined, returnUrl: undefined },
      replace: true,
    });
  }, [
    authPrompt,
    returnUrl,
    isRegistered,
    userState.state,
    openLoginModal,
    navigate,
  ]);

  // Render nothing while the session resolves or while a registered user is
  // being redirected — avoids flashing the marketing page at someone who's
  // about to land on /decks.
  if (userState.state === "loading" || userState.state === "registered") {
    return null;
  }

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <p className={styles.eyebrow}>competitive brain training</p>
        <h1 className={styles.heroTitle}>Ambi</h1>
        <p className={styles.heroTagline}>
          Train your mind. Beat the clock. Own the leaderboard.
        </p>
        <div className={styles.heroActions}>
          <Link to='/' viewTransition className={styles.btnPrimary}>
            Play Now
          </Link>
          <Link to='/about' viewTransition className={styles.btnSecondary}>
            Learn More
          </Link>
        </div>
      </section>

      <div className={styles.stats}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.statItem}>
            <span className={styles.statNumber}>{s.number}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <section className={styles.features}>
        <p className={styles.sectionLabel}>why ambi</p>
        <h2 className={styles.sectionTitle}>Built for competitors</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to flex?</h2>
        <p className={styles.ctaSub}>
          Join thousands of players and start training today.
        </p>
        <div className={styles.ctaActions}>
          <Link to='/' viewTransition className={styles.btnPrimary}>
            Get Started — it&apos;s free
          </Link>
        </div>
      </section>
    </>
  );
};
export { LandingPage };
