// SessionChat — the floating chat/reaction widget anchored to the bottom-right
// corner of an interactive session. It is intentionally small: its primary job
// is letting players fire off quick emoji reactions during a live game, with an
// optional text composer for actual messages.
//
// This file is split into two layers, mirroring the rest of the Session board
// (e.g. SessionPlayerList): `SessionChatView` is presentation-only — open/close
// and draft-text are local UI state and everything else arrives through props —
// while `SessionChat` (the default export the page renders) is the thin
// container. The container reads the live chat log + reaction bursts from
// `useSession()` (fed by the STOMP /chat and /reaction topics into the session
// slice) and sends over the shared session connection; the prop-driven view
// stays unaware of the transport.
import { useEffect, useRef, useState } from "react";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { useSession } from "@/features/liveSession/hooks/useSession";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import styles from "./SessionChat.module.css";

// TODO(migration): stubbed pending liveSession migration. Was imported from the
// interactiveSessionSlice; kept as a local placeholder so the reaction → message
// mapping below still type-checks.
interface LiveReaction {
  id: string;
  emoji: string;
  userName?: string;
  queuedAt: number;
}

interface ChatMessage {
  id: string;
  /** Display name of the sender. */
  author: string;
  /** Message text, or the emoji for a reaction message. */
  body: string;
  /** `reaction` renders a chrome-less emoji; defaults to `text`. */
  kind?: "text" | "reaction";
  /** Right-aligns the message as the current user's own. */
  isSelf?: boolean;
}

interface SessionChatViewProps {
  /** Newest-last list of messages to render in the scroll area. */
  messages?: ChatMessage[];
  /** Emoji offered in the quick-reaction row. */
  reactions?: string[];
  /** Show the text composer. Reactions are always available. */
  allowText?: boolean;
  /** Start expanded rather than collapsed to the launcher bubble. */
  defaultOpen?: boolean;
  /** Unread count shown on the launcher badge while collapsed. */
  unreadCount?: number;
  /** Heading shown in the panel. */
  title?: string;
  onReact?: (emoji: string) => void;
  onSendMessage?: (text: string) => void;
  className?: string;
}

const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "👏"];

// How close to the bottom (px) still counts as "pinned" — leaves slack for
// sub-pixel rounding and the gap below the last bubble.
const BOTTOM_PROXIMITY_PX = 24;

const SessionChatView = ({
  messages = [],
  reactions = DEFAULT_REACTIONS,
  allowText = true,
  defaultOpen = false,
  unreadCount = 0,
  title = "Chat",
  onReact,
  onSendMessage,
  className,
}: SessionChatViewProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");

  // Auto-scroll behaviour: keep the newest message in view, but only while the
  // reader is already pinned to the bottom. If they've scrolled up to read
  // history we leave their position alone. `atBottomRef` tracks that pinned
  // state as a ref (not state) because it updates on every scroll frame and
  // must never trigger a re-render.
  const listRef = useRef<HTMLOListElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list && atBottomRef.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [open, messages.length]);

  const sendDraft = () => {
    const text = draft.trim();
    if (text === "") return;
    onSendMessage?.(text);
    setDraft("");
  };

  return (
    <div
      className={[styles.sessionChat, className].filter(Boolean).join(" ")}
      data-open={open}>
      {open ? (
        <section className={styles.panel} aria-label={`${title} panel`}>
          <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <IconBtn
              fill='ghost'
              size='xs'
              icon={<XMarkIcon className={styles.chromeIcon} />}
              aria-label='Collapse chat'
              onClick={() => {
                setOpen(false);
              }}
            />
          </header>

          <ol
            ref={listRef}
            className={styles.messages}
            aria-live='polite'
            onScroll={(event) => {
              const list = event.currentTarget;
              atBottomRef.current =
                list.scrollHeight - list.scrollTop - list.clientHeight <
                BOTTOM_PROXIMITY_PX;
            }}>
            {messages.length === 0 ? (
              <li className={styles.empty}>No messages yet — say hi 👋</li>
            ) : (
              messages.map((message) => (
                <li
                  key={message.id}
                  className={styles.message}
                  data-self={message.isSelf === true}
                  data-kind={message.kind ?? "text"}>
                  <span className={styles.author}>{message.author}</span>
                  <span className={styles.bubble}>{message.body}</span>
                </li>
              ))
            )}
          </ol>

          <div className={styles.reactions} role='group' aria-label='Reactions'>
            {reactions.map((emoji) => (
              <button
                key={emoji}
                type='button'
                className={styles.reaction}
                aria-label={`React with ${emoji}`}
                onClick={() => {
                  onReact?.(emoji);
                }}>
                {emoji}
              </button>
            ))}
          </div>

          {allowText && (
            <form
              className={styles.composer}
              onSubmit={(event) => {
                event.preventDefault();
                sendDraft();
              }}>
              <input
                className={styles.input}
                type='text'
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                }}
                placeholder='Send a message…'
                aria-label='Message'
                maxLength={280}
              />
              <IconBtn
                fill='ghost'
                size='sm'
                icon={<PaperAirplaneIcon className={styles.chromeIcon} />}
                aria-label='Send message'
                disabled={draft.trim() === ""}
                onClick={sendDraft}
              />
            </form>
          )}
        </section>
      ) : (
        <button
          type='button'
          className={styles.launcher}
          aria-label='Open chat'
          onClick={() => {
            // Reopen pinned to the newest message — the list remounts fresh, so
            // a stale "scrolled up" flag from a previous session would otherwise
            // leave it parked at the top.
            atBottomRef.current = true;
            setOpen(true);
          }}>
          <ChatBubbleLeftRightIcon className={styles.launcherIcon} />
          {unreadCount > 0 && (
            <span className={styles.badge} aria-hidden='true'>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

// Translate a session chat DTO into the view's flat ChatMessage. Host lines and
// the viewer's own lines both come back from the same `players` roster, so the
// only viewer-relative bit is `isSelf` (drives right-alignment).
const toChatMessage = (
  message: any,
  viewerPlayerId: string | undefined,
): ChatMessage => ({
  id:
    message.id ?? `${message.authorPlayerId ?? "anon"}-${message.sentAt ?? ""}`,
  author: message.author?.name ?? "anon",
  body: message.body ?? "",
  kind: "text",
  isSelf:
    viewerPlayerId !== undefined && message.authorPlayerId === viewerPlayerId,
});

// A live reaction burst renders as a chrome-less emoji row. The slice keeps no
// per-reaction sender identity beyond the display name, so reactions are never
// flagged `isSelf` (alignment doesn't matter for the emoji-only rows).
const toReactionMessage = (reaction: LiveReaction): ChatMessage => ({
  id: reaction.id,
  author: reaction.userName ?? "",
  body: reaction.emoji,
  kind: "reaction",
});

interface SessionChatProps {
  className?: string;
}

const SessionChat = ({ className }: SessionChatProps) => {
  const { interactiveSession, chat, liveReactions } = useSession();
  const { sendChat, sendReaction } = useSessionConnection();
  const viewerPlayerId = interactiveSession.viewerPlayerId;
  const { chatEnabled, reactionsEnabled } = interactiveSession.settings;

  // Chat messages and reaction bursts both arrive over STOMP into the slice;
  // merge them into one time-ordered list so reactions appear inline between
  // messages. Sends go straight to the connection — the server echoes them back
  // on /chat and /reaction, so they land here through the same path.
  const messages: ChatMessage[] = [
    ...chat.map((m: any) => ({
      at: m.sentAt ? new Date(m.sentAt).getTime() : 0,
      msg: toChatMessage(m, viewerPlayerId),
    })),
    ...liveReactions.map((r) => ({
      at: r.queuedAt,
      msg: toReactionMessage(r),
    })),
  ]
    .sort((a, b) => a.at - b.at)
    .map((row) => row.msg);

  // `undefined` lets the view fall back to its DEFAULT_REACTIONS; an empty array
  // hides the reaction row when the host has disabled reactions.
  const reactions = (reactionsEnabled ?? true) ? undefined : [];

  return (
    <SessionChatView
      className={className}
      messages={messages}
      allowText={chatEnabled ?? true}
      reactions={reactions}
      onSendMessage={sendChat}
      onReact={sendReaction}
    />
  );
};

export { SessionChat, SessionChatView };
export type { ChatMessage, SessionChatViewProps };
