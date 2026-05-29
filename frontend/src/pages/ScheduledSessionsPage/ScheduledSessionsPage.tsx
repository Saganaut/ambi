/**
 * /scheduled — host's list of upcoming and past ScheduledInteractiveSessions.
 *
 * Upcoming = SCHEDULED + LIVE; Past = COMPLETED + CANCELLED.
 * Hosts can cancel a SCHEDULED row inline. Jumping into a LIVE session uses
 * the room code on the row (the cron sweep filled `createdInteractiveSessionId`
 * during boot, and the DTO carries the deck name for the row label).
 */
import { useNavigate, Link } from "@tanstack/react-router";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Badge } from "@/components/Common/Badge";
import {
  useListMyScheduledSessionsQuery,
  useCancelScheduledSessionMutation,
  useGetInteractiveSessionQuery,
  type ScheduledInteractiveSessionResponse,
} from "@/store/AmbiApi";
import styles from "./ScheduledSessionsPage.module.css";

const STATUS_VARIANT = {
  SCHEDULED: "info",
  LIVE: "success",
  COMPLETED: "secondary",
  CANCELLED: "warning",
} as const;

type Status = NonNullable<ScheduledInteractiveSessionResponse["status"]>;

const STATUS_LABEL: Record<Status, string> = {
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ACTIVE_STATUSES: Status[] = ["SCHEDULED", "LIVE"];

const formatWhen = (iso: string | undefined) => {
  if (!iso) return "";
  // Backend serialises LocalDateTime without a timezone; parse as local.
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface RowProps {
  session: ScheduledInteractiveSessionResponse;
  onCancel: (id: string) => void;
}

const ScheduledRow = ({ session, onCancel }: RowProps) => {
  const status: Status = session.status ?? "SCHEDULED";
  const isLive = status === "LIVE";
  // Live rows carry a `createdInteractiveSessionId` — fetch the live session
  // so we can surface the room code as a join link.
  const { data: live } = useGetInteractiveSessionQuery(
    { roomCode: session.createdInteractiveSessionId ?? "" },
    { skip: !isLive || !session.createdInteractiveSessionId },
  );

  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowDeck}>
          {session.deckName ?? "Untitled deck"}
        </span>
        <span className={styles.rowMeta}>
          {formatWhen(session.scheduledStartAt)} ·{" "}
          {session.invitedEmails?.length ?? 0} invitee
          {(session.invitedEmails?.length ?? 0) === 1 ? "" : "s"}
        </span>
      </div>
      <Badge variant={STATUS_VARIANT[status]} label={STATUS_LABEL[status]} />
      <div className={styles.rowActions}>
        {isLive && live?.roomCode && (
          <Link to='/sessions/$sessionId' params={{ sessionId: live.roomCode }}>
            <Btn size='sm' shape='pill' variant='brand'>
              Open session
            </Btn>
          </Link>
        )}
        {status === "SCHEDULED" && session.id && (
          <Btn
            size='sm'
            shape='pill'
            onClick={() => {
              onCancel(session.id ?? "");
            }}>
            Cancel
          </Btn>
        )}
      </div>
    </li>
  );
};

const ScheduledSessionsPage = () => {
  const { data: sessions, isLoading } = useListMyScheduledSessionsQuery();
  const [cancel] = useCancelScheduledSessionMutation();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const upcoming =
    sessions?.filter((s) =>
      ACTIVE_STATUSES.includes(s.status ?? "SCHEDULED"),
    ) ?? [];
  const past =
    sessions?.filter(
      (s) => !ACTIVE_STATUSES.includes(s.status ?? "SCHEDULED"),
    ) ?? [];

  const handleCancel = async (id: string) => {
    const ok = await confirm({
      title: "Cancel scheduled session?",
      message: "Invitees will receive a cancellation email.",
      confirmLabel: "Cancel session",
      variant: "danger",
    });
    if (!ok) return;
    await cancel({ id })
      .unwrap()
      .catch(() => null);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Scheduled sessions</h1>
      <p className={styles.empty}>
        <button
          type='button'
          onClick={() => {
            void navigate({ to: "/decks" });
          }}
          style={{
            background: "none",
            border: 0,
            color: "inherit",
            cursor: "pointer",
            textDecoration: "underline",
          }}>
          Pick a deck
        </button>{" "}
        to schedule a new session.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Upcoming</h2>
        {isLoading && <span className={styles.empty}>Loading…</span>}
        {!isLoading && upcoming.length === 0 && (
          <span className={styles.empty}>No upcoming sessions.</span>
        )}
        <ul className={styles.list}>
          {upcoming.map((s) => (
            <ScheduledRow
              key={s.id}
              session={s}
              onCancel={(id) => {
                void handleCancel(id);
              }}
            />
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Past</h2>
        {!isLoading && past.length === 0 && (
          <span className={styles.empty}>No past sessions yet.</span>
        )}
        <ul className={styles.list}>
          {past.map((s) => (
            <ScheduledRow
              key={s.id}
              session={s}
              onCancel={() => {
                /* not possible from PAST */
              }}
            />
          ))}
        </ul>
      </section>
    </div>
  );
};

export { ScheduledSessionsPage };
