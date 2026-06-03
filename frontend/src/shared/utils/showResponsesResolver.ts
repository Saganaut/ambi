// Frontend mirror of the backend ShowResponsesResolver. Walks the chunk-24
// runtime cascade (element > deck > session) and falls back to the format
// default when every layer is INHERIT. Used by:
//   - The editor preview (so the per-element dropdown can show the resolved
//     value as ghost text under INHERIT).
//   - Host reveal-now button (only enabled when the resolved value is
//     ON_CLICK).
//   - Player UI (decides whether to render aggregated responses live).
//
// The backend resolver lives at
// `backend/src/main/java/cephadex/ambi/service/ShowResponsesResolver.java`.
// Keep the two in sync — the per-format default below mirrors the spec in
// `z-docs/to-do/24-session-format-and-runtime-cascades/README.md`.
import type {
  DeckResponse,
  InteractiveSessionResponse,
  InteractiveSessionSettings,
} from "@store/AmbiApi";

export type ShowResponsesMode = "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";
export type SessionFormat = "GAME" | "PRESENTATION";

// Only Slide carries a per-element `showResponses` override (chunk 24 + 25);
// other kinds inherit at INHERIT and the resolver falls through to deck /
// session / format defaults.
interface ElementWithShowResponses {
  showResponses?: ShowResponsesMode;
}

const FORMAT_DEFAULT: Record<
  SessionFormat,
  "INSTANT" | "ON_CLICK" | "PRIVATE"
> = {
  GAME: "INSTANT",
  PRESENTATION: "ON_CLICK",
};

const isExplicit = (
  value: ShowResponsesMode | undefined,
): value is "INSTANT" | "ON_CLICK" | "PRIVATE" =>
  value !== undefined && value !== "INHERIT";

interface ResolveArgs {
  format: SessionFormat | undefined;
  sessionShowResponses: ShowResponsesMode | undefined;
  deckShowResponses: ShowResponsesMode | undefined;
  elementShowResponses: ShowResponsesMode | undefined;
}

/**
 * Pure resolver — the four-arg form so the editor preview can call it with
 * just the deck + element values (session left undefined) and still get a
 * sensible answer.
 */
export const resolveShowResponses = ({
  format,
  sessionShowResponses,
  deckShowResponses,
  elementShowResponses,
}: ResolveArgs): "INSTANT" | "ON_CLICK" | "PRIVATE" => {
  if (isExplicit(elementShowResponses)) return elementShowResponses;
  if (isExplicit(deckShowResponses)) return deckShowResponses;
  if (isExplicit(sessionShowResponses)) return sessionShowResponses;
  return FORMAT_DEFAULT[format ?? "GAME"];
};

/**
 * Convenience overload that pulls the values straight off the DTOs. Pass the
 * deck when known (the InteractiveSession freezes a snapshot but doesn't
 * carry `defaultShowResponses` independently).
 */
export const resolveShowResponsesFor = (
  session: InteractiveSessionResponse | undefined,
  deck: Pick<DeckResponse, "defaultShowResponses"> | undefined,
  element: ElementWithShowResponses | undefined,
): "INSTANT" | "ON_CLICK" | "PRIVATE" => {
  const settings: InteractiveSessionSettings | undefined = session?.settings;
  return resolveShowResponses({
    format: session?.format,
    sessionShowResponses: settings?.showResponses,
    deckShowResponses: deck?.defaultShowResponses,
    elementShowResponses: element?.showResponses,
  });
};

export const formatDefaultShowResponses = (
  format: SessionFormat,
): "INSTANT" | "ON_CLICK" | "PRIVATE" => FORMAT_DEFAULT[format];
