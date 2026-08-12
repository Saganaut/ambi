// Player entry point for a live session. Reached from the lobby QR / share link
// (`/join?code=<roomCode>`) or by typing a room code. Prefills the code from the
// URL, collects a display name, and hands off to the `useLiveSession` view-model,
// which joins by room code and navigates to the session page.
//
// NOTE: full guest-player support is a follow-up — the session route
// (`/sessions/$sessionId`) is currently gated to registered users, so a guest who
// joins can't yet reach it. Until that guard is opened up, this page requires a
// signed-in session; the guest-provisioning + guarded-route work is tracked
// separately.
import { useState, type FormEvent } from "react";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";
import { useLiveSession } from "@features/liveSession/hooks/useLiveSession";
import { Input } from "@components/Forms/Input/Input/Input";
import { Btn } from "@saganaut/ambi-ui";
import styles from "./SessionJoinPage.module.css";

interface SessionJoinPageProps {
  /** Room code prefilled from the `?code=` query param (the QR / share link). */
  code?: string;
}

const SessionJoinPage = ({ code }: SessionJoinPageProps) => {
  const auth = useCurrentUser();
  const { join } = useLiveSession();

  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState(code ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Both a guest and a registered player may call the join command; only a
  // no-identity visitor (or a half-finished pre-registration) must sign in first.
  const canJoin = auth.state === "registered" || auth.state === "guest";
  const needsSignIn =
    auth.state === "visitor" ||
    auth.state === "preRegistration" ||
    auth.state === "error";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    const roomCodeValue = roomCode.trim().toUpperCase();
    if (name === "" || roomCodeValue === "") {
      setError("Enter your name and the room code.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // `join` navigates to the session page on success.
      await join({ roomCode: roomCodeValue, displayName: name });
    } catch {
      setError("Couldn't join that session — check the room code and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Join a game</h1>

        {needsSignIn && (
          <p className={styles.notice}>Sign in to join a game.</p>
        )}

        <Input
          label="Room code"
          id="join-room-code"
          type="text"
          fullWidth
          value={roomCode}
          placeholder="ABCDEFGH"
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
        />
        <Input
          label="Your name"
          id="join-display-name"
          type="text"
          fullWidth
          value={displayName}
          placeholder="Pick a display name"
          onChange={(event) => setDisplayName(event.target.value)}
        />

        {error && <p className={styles.error}>{error}</p>}

        <Btn type="submit" variant="primary" isLoading={submitting} isDisabled={!canJoin}>
          Join
        </Btn>
      </form>
    </div>
  );
};

export { SessionJoinPage };
