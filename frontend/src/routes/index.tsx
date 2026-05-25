// Home route ("/"). This IS the public landing page — there is no separate
// slug. LandingPage renders the marketing content for visitors and guests and
// redirects registered users on to their workspace (/decks). The
// /_authenticated gate also bounces unauthenticated users here with
// `authPrompt=true` plus the blocked path as `returnUrl`, which LandingPage
// reads to open the LoginModal. `authPrompt` is only ever `true` or absent —
// we never serialize `authPrompt=false` into the URL.
import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "../pages/LandingPage/LandingPage";

interface IndexSearch {
  authPrompt?: true;
  returnUrl?: string;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    authPrompt:
      search.authPrompt === true || search.authPrompt === "true"
        ? true
        : undefined,
    returnUrl:
      typeof search.returnUrl === "string" ? search.returnUrl : undefined,
  }),
  component: LandingPage,
});
