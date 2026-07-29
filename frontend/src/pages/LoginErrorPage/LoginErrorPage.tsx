// Landing target for the backend's OAuth2 failure handler: a failed OAuth
// sign-in (cancelled consent, provider error, state mismatch) redirects here
// instead of Spring's default /login?error, which is not an SPA route. The
// redirect carries no provider or origin info, so the copy stays
// provider-neutral and "Try again" reopens the shared LoginModal for the user
// to pick any provider. No account or session state changed on the failed
// attempt, so retrying is always safe. The modal's returnUrl is pinned to "/"
// — its default (current location) would bounce a successful retry straight
// back to this error page.
import { Link } from "@tanstack/react-router";
import LostFish from "@assets/images/mascots/lost-fish.svg?react";
import { ErrorDisplay } from "@ui/ErrorDisplay/ErrorDisplay";
import { Btn } from "@ui/Buttons/Btn";
import { useRequireLogin } from "@auth/hooks/useRequireLogin";
import styles from "./LoginErrorPage.module.css";

const LoginErrorPage = () => {
  const { openLoginModal } = useRequireLogin();

  return (
    <main className={styles.page}>
      <ErrorDisplay
        title='Sign-in didn&apos;t finish'
        message='We couldn&apos;t complete your sign-in. It may have been cancelled, timed out, or hit a temporary provider hiccup. Nothing was changed on your account — you can safely try again.'
        mascot={LostFish}
        actions={
          <>
            <Btn
              className={styles.retryBtn}
              onClick={() => {
                openLoginModal({ returnUrl: "/" });
              }}>
              Try again
            </Btn>
            <Link to='/' className={styles.homeLink} viewTransition>
              Take me home
            </Link>
          </>
        }
      />
    </main>
  );
};

export { LoginErrorPage };
