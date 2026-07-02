// Single source of truth for the participant join URL a room code resolves to.
// The lobby QR encodes this string and the (future) `/join` route reads the
// `code` query param back off it — keep both ends pointed here so the shape only
// ever changes in one place.

/**
 * The absolute URL a participant lands on to join a room, e.g.
 * `https://app.example.com/join?code=ABCD1234`.
 *
 * @param roomCode the session's room code
 * @param origin   the site origin to build against (default: the current
 *                 `window.location.origin`), injectable for tests/SSR
 */
const buildJoinUrl = (
  roomCode: string,
  origin: string = window.location.origin,
): string => `${origin}/join?code=${encodeURIComponent(roomCode)}`;

export { buildJoinUrl };
