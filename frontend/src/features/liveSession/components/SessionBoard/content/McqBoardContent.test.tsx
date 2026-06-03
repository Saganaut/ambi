// Tests for MCQ answering on the board: a participant drafts a selection and
// submits (publishing an McqAnswer and locking the inputs), and the host's
// end-submit flush auto-submits the current draft. The session connection is
// mocked; a real slice-backed store still drives the submitted/locked state, and
// useSession is mocked to read the live fields (myAnswer / submissionsClosing)
// straight off that store — so the dispatch → slice → useSession → component
// round-trip is exercised end to end.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider, useSelector } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import interactiveSessionReducer, {
  submissionsClosingReceived,
} from "@/store/interactiveSessionSlice";
import type { McqQuestion } from "@/types/elements";

const h = vi.hoisted(() => ({ sendAnswer: vi.fn() }));

vi.mock("@/pages/SessionPage/SessionConnectionContext", () => ({
  useSessionConnection: () => ({ sendAnswer: h.sendAnswer }),
}));
vi.mock("@/pages/SessionPage/useSession", () => ({
  useSession: () => {
    const slice = useSelector(
      (s: { interactiveSession: ReturnType<typeof interactiveSessionReducer> }) =>
        s.interactiveSession,
    );
    return {
      roundResult: slice.roundResult,
      myAnswer: slice.myAnswer,
      submissionsClosing: slice.submissionsClosing,
    };
  },
}));

import { McqBoardContent } from "./McqBoardContent";

const question = {
  kind: "McqQuestion",
  id: "el-0",
  options: [
    { id: "a", text: "Alpha" },
    { id: "b", text: "Bravo" },
  ],
  correctOptionIds: ["a"],
  allowMultipleSelect: false,
} as unknown as McqQuestion;

const makeStore = () =>
  configureStore({ reducer: { interactiveSession: interactiveSessionReducer } });

const renderContent = (
  store: ReturnType<typeof makeStore>,
  interactive = true,
) =>
  render(
    <Provider store={store}>
      <McqBoardContent question={question} mode='prompt' interactive={interactive} />
    </Provider>,
  );

describe("McqBoardContent answering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the selected option and locks in", async () => {
    const store = makeStore();
    renderContent(store);

    await userEvent.click(screen.getByRole("button", { name: "Alpha" }));
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      kind: "McqAnswer",
      optionIds: ["a"],
    });
    // The slice now holds myAnswer → the surface shows the locked state.
    expect(screen.getByText("Answer locked in ✓")).toBeInTheDocument();
  });

  it("does not submit with no selection (button disabled)", () => {
    const store = makeStore();
    renderContent(store);
    expect(
      screen.getByRole("button", { name: "Lock in answer" }),
    ).toBeDisabled();
  });

  it("flushes the draft when the host ends the submit phase", () => {
    const store = makeStore();
    renderContent(store);

    // Draft a selection without submitting, then the host ends submit.
    act(() => {
      screen.getByRole("button", { name: "Bravo" }).click();
    });
    act(() => {
      store.dispatch(
        submissionsClosingReceived({
          round: 0,
          elementId: "el-0",
          graceMillis: 1500,
        }),
      );
    });

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      kind: "McqAnswer",
      optionIds: ["b"],
    });
  });

  it("is read-only when not interactive (projected / revealed view)", () => {
    const store = makeStore();
    renderContent(store, false);
    expect(
      screen.queryByRole("button", { name: "Lock in answer" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha" })).toBeDisabled();
  });
});
