/**
 * Typed Redux hooks for this app.
 * Import these instead of plain useDispatch/useSelector so TypeScript
 * knows the exact shape of the store and dispatch type.
 */
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
