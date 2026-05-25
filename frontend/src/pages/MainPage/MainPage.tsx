// MainPage: the app's entry point. Prompts users to create a game, create a poll,
// or join an existing session with a room code. Per GAMES.md, this is the quick-start
// surface — no customization shown up front; deeper options live behind the actions.
import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { Route as IndexRoute } from "../../routes/index";
import { ActionCard } from "@/components/Common/Cards/ActionCard";
import styles from "./MainPage.module.css";

const MainPage = () => {
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";

  // When the /_authenticated layout redirects an unauthenticated user here,
  // it sets `?authPrompt=true&returnUrl=<original>`. Surface the sign-in
  // modal pre-loaded with the original destination, then strip the params
  // so a refresh or back-nav doesn't reopen it.
  const { authPrompt, returnUrl } = IndexRoute.useSearch();
  const { openLoginModal } = useRequireLogin();
  const navigate = useNavigate();
  const hasPromptedRef = useRef(false);

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

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>brainflex</p>
        <h1 className={styles.heroTitle}>What do you want to do?</h1>
        <p className={styles.heroSubtitle}>
          Start a game, run a poll, or jump into a session with a code.
        </p>
      </header>

      <section className={styles.cards} aria-label='Primary actions'>
        <ActionCard
          to='/decks'
          icon='+'
          title='Create a Game'
          description='Pick a deck from My Decks and hit Play.'
          disabled={!isRegistered}
        />
        <ActionCard
          to='/pulse/create'
          icon='~'
          title='Create a Poll'
          description='Run an audience poll — capture answers, no scoring.'
          badge='Soon'
          disabled={!isRegistered}
        />
        <ActionCard
          to='/games/join'
          icon='->'
          title='Join with a Code'
          description='Got a 6-character room code? Hop straight into the lobby.'
        />
      </section>

      {!isRegistered && userState.state !== "loading" && (
        <p className={styles.signinHint}>Sign in to create games and polls.</p>
      )}
    </div>
  );
};

export { MainPage };
