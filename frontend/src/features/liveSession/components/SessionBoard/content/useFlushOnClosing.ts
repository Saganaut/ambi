// Chunk 25 — board-content hook for the host "end submit phase" action.
//
// When the host ends the submit window, the server broadcasts /submissionsClosing
// and the slice raises a one-shot `submissionsClosing` signal (a bumped nonce
// scoped to an elementId). Each participant device that is rendering the active
// question watches that signal and, if it holds a typed-but-unsubmitted draft,
// flushes it through the normal answer path before the round freezes — then
// clears the signal so it fires exactly once.
//
// The signal is read through useSession() (the one merged session view) rather
// than off the slice directly; clearing it is a write, so that stays a dispatch.
import { useEffect, useRef } from "react";
import { useSession } from "@/features/liveSession/hooks/useSession";

/**
 * Run `flush` once when the host closes the submit phase for `elementId`.
 * `flush` should submit the current draft if there is one (and is free to no-op
 * when there's nothing to send). The signal is consumed after flushing so a
 * single end-submit can't double-fire.
 */
export function useFlushOnClosing(elementId: string | undefined, flush: () => void): void {
  const { submissionsClosing: closing } = useSession();
  // Latest-ref so `nonce` is the only effect trigger — we want the current
  // draft at fire time without re-running when the flush closure changes.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  // Only react when the close targets this element; the nonce is the trigger.
  const nonce = closing && elementId && closing.elementId === elementId ? closing.nonce : null;

  // TODO(migration): stubbed pending liveSession migration. The
  // submissionsClosingConsumed dispatch that cleared the one-shot signal lived
  // on the interactiveSessionSlice; with the slice gone the signal never fires
  // (useSession returns a null `submissionsClosing`), so flush stays a no-op.
  useEffect(() => {
    if (nonce == null) return;
    flushRef.current();
  }, [nonce]);
}
