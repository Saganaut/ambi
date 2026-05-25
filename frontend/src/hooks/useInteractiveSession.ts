/**
 * Typed selector hook that returns the full InteractiveSession state from the
 * Redux store. Components import this instead of calling useAppSelector directly
 * so the session slice shape is accessed from one place.
 */
import { useAppSelector } from "../store/hooks";

export function useInteractiveSession() {
  return useAppSelector((state) => state.interactiveSession);
}
