// Landing target for the backend's GoogleOAuth2FailureHandler: a failed OAuth
// sign-in (cancelled consent, provider error, state mismatch) redirects here
// instead of Spring's default /login?error, which is not an SPA route. No
// account or session state changed on the failed attempt, so "Try again"
// simply restarts the OAuth flow.
import { Link } from "@tanstack/react-router";
import LostFish from "@assets/images/mascots/lost-fish.svg?react";
import { ErrorDisplay } from "@ui/ErrorDisplay/ErrorDisplay";
import { Btn } from "@ui/Buttons/Btn";
import { apiBaseUrl } from "@store/emptyApi";
import styles from "./LoginErrorPage.module.css";

const LoginErrorPage = () => (
  <main className={styles.page}>
    <ErrorDisplay
      title='Sign-in didn&apos;t finish'
      message='We couldn&apos;t complete your Google sign-in. It may have been cancelled, timed out, or hit a temporary provider hiccup. Nothing was changed on your account — you can safely try again.'
      mascot={LostFish}
      actions={
        <>
          <Btn
            className={styles.retryBtn}
            onClick={() => {
              window.location.assign(`${apiBaseUrl}/oauth2/authorization/google`);
            }}>
            Try again with Google
          </Btn>
          <Link to='/' className={styles.homeLink} viewTransition>
            Take me home
          </Link>
        </>
      }
    />
  </main>
);

export { LoginErrorPage };
