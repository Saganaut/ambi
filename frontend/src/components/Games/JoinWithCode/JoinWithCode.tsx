// Player-facing form for joining an interactive session by typing the 6-char
// room code. Self-contained: owns its input state, calls the join-by-code
// mutation, and navigates into the Gen-2 session on success. Lives in components/Games
// so it can be embedded in the join page as well as alongside DisplayQR /
// DisplayJoinCode on a host's "share this game" panel.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useJoinByRoomCodeMutation } from "@/store/BrainFlexApi";
import { extractErrorMessage } from "@/utils/utils";
import { Alert } from "@/components/Common/Alert/Alert";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Input } from "@/components/Common/Input/Input/Input";
import styles from "./JoinWithCode.module.css";

const ROOM_CODE_LENGTH = 6;

const JoinWithCode = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [joinGame, { isLoading, error }] = useJoinByRoomCodeMutation();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== ROOM_CODE_LENGTH) return;
    try {
      await joinGame({
        roomCode: trimmed,
        joinInteractiveSessionRequest: {},
      }).unwrap();
      await navigate({
        to: "/sessions/$sessionId",
        params: { sessionId: trimmed },
      });
    } catch {
      // surfaced through `error` below
    }
  };

  return (
    <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
      <Input
        className={styles.codeInput}
        value={code}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setCode(e.target.value.toUpperCase());
        }}
        placeholder='Enter code'
        maxLength={ROOM_CODE_LENGTH}
        autoFocus
        autoComplete='off'
        spellCheck={false}
      />
      <Btn
        type='submit'
        className={styles.joinBtn}
        disabled={code.trim().length !== ROOM_CODE_LENGTH || isLoading}>
        {isLoading ? "Joining…" : "Join"}
      </Btn>
      {error != null && (
        <Alert severity='error'>
          {extractErrorMessage(
            error,
            "Could not join — check the code and try again.",
          )}
        </Alert>
      )}
    </form>
  );
};

export { JoinWithCode };
