import { useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Route as IndexRoute } from "../../routes/index";

import styles from "./LandingPage.module.css";
import { HeroDotGrid } from "./HeroDotGrid/HeroDotGrid";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";
import { useRequireLogin } from "@auth/hooks/useRequireLogin";

const FEATURES = [
  {
    icon: "🎨",
    title: "Author Any Slide",
    desc: "17 slide types — from title and media to multiple choice, ranking, 2D axis, grids, drawing, and audience Q&A — with deck defaults and per-slide overrides.",
  },
  {
    icon: "📊",
    title: "Answers Become Data",
    desc: "Every response is a typed, server-scored submission — tallied live and projected into results charts your whole room can see.",
  },
  {
    icon: "🏆",
    title: "Host a Live Game",
    desc: "Scored rounds, round timers, phased reveals, a live leaderboard, and best-answer voting turn any deck into a competition.",
  },
];

const STATS = [
  { number: "17", label: "Slide Types" },
  { number: "Live", label: "Server Scoring" },
  { number: "QR", label: "Instant Join" },
];

const LandingPage = () => {
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";
  const { authPrompt, returnUrl } = IndexRoute.useSearch();
  const { openLoginModal } = useRequireLogin();
  const navigate = useNavigate();
  const hasPromptedRef = useRef(false);

  // "/" is the public home, but a registered user has no use for the marketing
  // page — send them straight to their workspace — and a preRegistration
  // session's only destination is finishing sign-up. Visitors and guests stay
  // and see the product below. The backend's OAuth success redirect already
  // routes both states server-side; this is the client backstop for direct
  // navigation to "/".
  useEffect(() => {
    if (userState.state === "registered") {
      void navigate({ to: "/decks", replace: true });
    } else if (userState.state === "preRegistration") {
      // Forward any blocked-path returnUrl (from an authPrompt bounce) so it
      // survives registration; /register's validateSearch sanitizes it.
      void navigate({ to: "/register", search: { returnUrl }, replace: true });
    }
  }, [userState.state, returnUrl, navigate]);

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

  // Render nothing while the session resolves or while a redirect from the
  // effect above is pending — avoids flashing the marketing page at someone
  // who's about to land on /decks or /register.
  if (
    userState.state === "loading" ||
    userState.state === "registered" ||
    userState.state === "preRegistration"
  ) {
    return null;
  }

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              interactive presentations&ensp;·&ensp;live audience play
            </p>
            <h1 className={styles.heroTitle}>
              Ambi<span className={styles.heroTitleDot}>.</span>
            </h1>
            <p className={styles.heroTagline}>Present. Engage. Compete.</p>
            <p className={styles.heroBody}>
              Build decks of interactive slides and run them live. Your audience
              joins from any device by room code or QR, answers in real time,
              and watches responses, results, and standings unfold on the shared
              board.
            </p>
            <div className={styles.heroActions}>
              <Link to='/' viewTransition className={styles.btnPrimary}>
                Get Started
              </Link>
              <Link to='/about' viewTransition className={styles.btnSecondary}>
                Learn More
              </Link>
            </div>
          </div>
          <HeroDotGrid />
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
        <h2 className={styles.sectionTitle}>Built for presenters</h2>
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
        <h2 className={styles.ctaTitle}>Ready to present?</h2>
        <p className={styles.ctaSub}>
          Build your first deck and run it live — free to start.
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
