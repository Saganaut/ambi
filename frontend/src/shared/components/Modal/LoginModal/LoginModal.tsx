/**
 * Modal body that prompts an unauthenticated user to sign in. Rendered inside
 * the shared `useModal` dialog (no <Modal> wrapper here — `openLoginModal`
 * passes this component as `content` so the global ModalProvider handles
 * framing, backdrop, and close behavior).
 *
 * Each provider button kicks the browser straight to Spring Security's OAuth
 * entry point, `/oauth2/authorization/<id>`, preserving the current location as
 * a RELATIVE `returnUrl` (the backend's ReturnUrlValidator requires a leading
 * "/" and rejects absolute URLs). No `guestId` is forwarded — a pre-OAuth guest
 * is promoted in place from its session cookie, not a query param. The backend
 * redirects back to the SPA at `returnUrl` with the session cookies set.
 * Additional providers plug in as another entry in PROVIDERS — keep them
 * visually consistent. Providers without a backend integration yet stay
 * listed as disabled placeholders (`enabled: false`).
 */
import { apiBaseUrl } from "@store/emptyApi";
import { toLocalReturnUrl } from "@utils/returnUrl";
import { Btn } from "@ui/Buttons/Btn";
import styles from "./LoginModal.module.css";

interface LoginModalProps {
  message?: string;
  returnUrl?: string;
}

const GoogleGlyph = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 48 48'
    aria-hidden='true'
    focusable='false'>
    <path
      fill='#EA4335'
      d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'
    />
    <path
      fill='#4285F4'
      d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'
    />
    <path
      fill='#FBBC05'
      d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'
    />
    <path
      fill='#34A853'
      d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'
    />
    <path fill='none' d='M0 0h48v48H0z' />
  </svg>
);

const DiscordGlyph = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 24 24'
    aria-hidden='true'
    focusable='false'>
    <path
      fill='#5865F2'
      d='M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.607-.719 1.4-.984 2.023a18.24 18.24 0 0 0-5.487 0 12.5 12.5 0 0 0-.997-2.023A.077.077 0 0 0 8.932 3.2a19.736 19.736 0 0 0-3.76 1.169.07.07 0 0 0-.032.027C2.534 7.99 1.879 11.508 2.201 14.983a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.21 14.21 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.118 13.118 0 0 1-1.873-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .031-.056c.5-4.022-.838-7.503-3.549-10.586a.06.06 0 0 0-.031-.028zM8.02 12.86c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.335-.955 2.42-2.157 2.42zm7.974 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.335-.946 2.42-2.157 2.42z'
    />
  </svg>
);

const MicrosoftGlyph = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 23 23'
    aria-hidden='true'
    focusable='false'>
    <path fill='#F25022' d='M1 1h10v10H1z' />
    <path fill='#7FBA00' d='M12 1h10v10H12z' />
    <path fill='#00A4EF' d='M1 12h10v10H1z' />
    <path fill='#FFB900' d='M12 12h10v10H12z' />
  </svg>
);

const PROVIDERS = [
  {
    id: "google",
    label: "Continue with Google",
    Glyph: GoogleGlyph,
    enabled: true,
  },
  {
    id: "discord",
    label: "Continue with Discord",
    Glyph: DiscordGlyph,
    enabled: false,
  },
  {
    id: "microsoft",
    label: "Continue with Microsoft",
    Glyph: MicrosoftGlyph,
    enabled: false,
  },
] as const;

// Collapse a returnUrl to a backend-acceptable relative path, falling back to
// the current path+search+hash when the supplied value isn't a clean local
// path (the backend ReturnUrlValidator would coerce anything else to "/").
const toRelativeReturnUrl = (returnUrl?: string): string => {
  return (
    toLocalReturnUrl(returnUrl) ??
    window.location.pathname + window.location.search + window.location.hash
  );
};

const LoginModal = ({ message, returnUrl }: LoginModalProps) => {
  const handleLogin = (provider: string) => {
    const loginUrl = new URL(`${apiBaseUrl}/oauth2/authorization/${provider}`);
    loginUrl.searchParams.set("returnUrl", toRelativeReturnUrl(returnUrl));
    window.location.assign(loginUrl.toString());
  };

  return (
    <div className={styles.container}>
      {message != null && <p className={styles.message}>{message}</p>}
      <div className={styles.providers}>
        {PROVIDERS.map(({ id, label, Glyph, enabled }) => (
          <Btn
            key={id}
            className={styles.providerBtn}
            icon={<Glyph />}
            disabled={!enabled}
            onClick={() => {
              handleLogin(id);
            }}>
            {label}
          </Btn>
        ))}
      </div>
    </div>
  );
};

export { LoginModal };
export type { LoginModalProps };
