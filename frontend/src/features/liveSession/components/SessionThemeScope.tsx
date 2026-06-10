// Applies the presented deck's theme across the whole live-session screen. It
// reads the session's deck (via useSession, so it must live inside the
// SessionConnectionProvider) and hands its themeId to DeckThemeScope. When the
// deck has no theme — or a participant can't read it — the session keeps the
// global theme. SessionPage itself is left untouched.
import type { ReactNode } from "react";
import { useSession } from "@features/liveSession/hooks/useSession";
import { DeckThemeScope } from "@features/theme/components/DeckThemeScope";

const SessionThemeScope = ({ children }: { children: ReactNode }) => {
  const { currentDeck } = useSession();
  return <DeckThemeScope themeId={currentDeck?.themeId}>{children}</DeckThemeScope>;
};

export { SessionThemeScope };
