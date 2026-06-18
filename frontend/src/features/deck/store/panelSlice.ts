import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type PanelKey =
  | "deck"
  | "edit"
  | "answers"
  | "quiz"
  | "discussion"
  | "participants"
  | "sharing";

interface PanelState {
  panelKey: PanelKey;
  isOpen: boolean;
}
const initialState = { panelKey: "deck", isOpen: false } satisfies PanelState as PanelState;

const panelSlice = createSlice({
  name: "panel",
  initialState,
  reducers: {
    open(state, action: PayloadAction<PanelKey>) {
      state.panelKey = action.payload;
      state.isOpen = true;
    },
    close(state) {
      state.isOpen = false;
    },
  },
});

export const { open, close } = panelSlice.actions;
export default panelSlice.reducer;
