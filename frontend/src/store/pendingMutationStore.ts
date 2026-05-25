/**
 * sessionStorage-backed slot for the *one* mutation that was about to fire when
 * the user got bounced to the LoginModal. Phase 4 of the auth-hardening plan:
 * after a successful login, an AuthReplayBridge reads this slot and offers the
 * user a "Pick up where you left off" toast that re-dispatches the same
 * mutation. We intentionally keep a single slot (latest 401 wins) rather than a
 * queue — replay UX gets confusing fast once two distinct intents are pending.
 *
 * Stored payload is plain JSON, so anything not JSON-serialisable (File, Blob,
 * FormData) can't round-trip. The capture middleware is responsible for
 * filtering those out at write time — we don't try to be clever here.
 */
const STORAGE_KEY = "brainflex:pendingMutation";
const TTL_MS = 5 * 60 * 1000;

export interface PendingMutation {
  endpointName: string;
  originalArgs: unknown;
  label: string;
  capturedAt: number;
}

export function setPendingMutation(entry: PendingMutation): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage can be unavailable (private mode, quota) — replay then
    // silently doesn't fire, which is the right failure mode here.
  }
}

export function readPendingMutation(): PendingMutation | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as PendingMutation;
    if (Date.now() - parsed.capturedAt > TTL_MS) {
      clearPendingMutation();
      return null;
    }
    return parsed;
  } catch {
    clearPendingMutation();
    return null;
  }
}

export function clearPendingMutation(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
