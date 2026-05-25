/**
 * Renders the most recent WebSocket-handler error from Redux state.
 * Used in the Lobby and Play views where actions (Start, Submit Answer, etc.)
 * are fire-and-forget STOMP messages with no natural place for server feedback.
 * Hidden when there is no error. Dismiss clears the slice's wsError.
 */
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { clearWsError } from "../../../store/interactiveSessionSlice";
import { IconBtn } from "../../Common/Buttons/IconBtn";
import styles from "./WsErrorBanner.module.css";
//TODO: WE should have a general error banner component, likely in a provider so it can be re-used.
const WsErrorBanner = () => {
  const dispatch = useAppDispatch();
  const error = useAppSelector((s) => s.interactiveSession.wsError);

  if (!error) return null;

  return (
    <div className={styles.banner} role='alert'>
      <span className={styles.message}>
        <strong className={styles.operation}>
          {labelFor(error.operation)}:
        </strong>{" "}
        {error.message}
      </span>
      <IconBtn
        fill='ghost'
        icon={<XMarkIcon />}
        size='sm'
        onClick={() => {
          dispatch(clearWsError());
        }}
        aria-label='Dismiss error'
      />
    </div>
  );
};

const labelFor = (op: string): string => {
  switch (op) {
    case "start":
      return "Couldn't start the game";
    case "answer":
      return "Couldn't submit answer";
    case "nextRound":
      return "Couldn't advance round";
    case "leave":
      return "Couldn't leave";
    default:
      return "Error";
  }
};

export { WsErrorBanner };
