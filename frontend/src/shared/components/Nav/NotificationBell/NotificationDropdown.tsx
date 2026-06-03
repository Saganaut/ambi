// Dropdown panel that lists the most recent notifications grouped by day,
// supports "Mark all as read", and lets the user dismiss individual rows.
// Clicking a row marks it read and navigates to the deep link.
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";

import { resolveAvatarSrc } from "@utils/avatarUrl";
import styles from "./NotificationBell.module.css";

interface DayBucket {
  label: string;
  items: NotificationResponse[];
}

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useListNotificationsQuery({ page: 0, size: 20 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [dismiss] = useDismissNotificationMutation();

  const buckets = useMemo<DayBucket[]>(
    () => groupByDay(data?.items ?? []),
    [data],
  );
  const hasUnread = (data?.items ?? []).some((row) => !row.read);

  const handleRowClick = (row: NotificationResponse) => {
    if (!row.read && row.id) {
      // Fire-and-forget; the optimistic cache patch keeps the UI in sync.
      void markRead({ id: row.id });
    }
    if (row.link) {
      // The link is a stored in-app path; cast to the router's URL type since
      // we don't know its concrete shape at compile time.
      void navigate({ to: row.link as never });
    }
  };

  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>
        <span className={styles.title}>Notifications</span>
        <button
          type='button'
          className={styles.actionBtn}
          onClick={() => void markAllRead()}
          disabled={!hasUnread}>
          Mark all as read
        </button>
      </div>
      <div className={styles.scroller}>
        {isLoading ? (
          <div className={styles.loading}>Loading…</div>
        ) : buckets.length === 0 ? (
          <div className={styles.empty}>You're all caught up.</div>
        ) : (
          buckets.map((bucket) => (
            <div key={bucket.label} className={styles.dayGroup}>
              <div className={styles.dayLabel}>{bucket.label}</div>
              {bucket.items.map((row) => (
                <div
                  key={row.id}
                  role='button'
                  tabIndex={0}
                  aria-label={
                    !row.read
                      ? `Unread: ${row.title ?? "notification"}`
                      : (row.title ?? "Notification")
                  }
                  className={[styles.row, !row.read && styles.rowUnread]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    handleRowClick(row);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowClick(row);
                    }
                  }}>
                  {row.actor?.pictureUrl ? (
                    <img
                      className={styles.avatar}
                      src={resolveAvatarSrc(row.actor.pictureUrl)}
                      alt=''
                    />
                  ) : (
                    <span className={styles.avatar} aria-hidden='true' />
                  )}
                  <div className={styles.body}>
                    <span className={styles.bodyTitle}>{row.title}</span>
                    {row.body && (
                      <span className={styles.bodyExcerpt}>{row.body}</span>
                    )}
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowTimestamp}>
                      {row.createdAt ? formatRelative(row.createdAt) : ""}
                    </span>
                    <button
                      type='button'
                      className={styles.dismissBtn}
                      aria-label='Dismiss notification'
                      onClick={(e) => {
                        e.stopPropagation();
                        if (row.id) void dismiss({ id: row.id });
                      }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/** Buckets rows into Today / Yesterday / This week / Earlier groups, newest
 *  first. Server returns rows already ordered by createdAt DESC, so the
 *  bucketing only needs one pass without re-sorting. */
function groupByDay(rows: NotificationResponse[]): DayBucket[] {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - DAY_MS);
  const oneWeekAgo = new Date(today.getTime() - 6 * DAY_MS);

  const order = ["Today", "Yesterday", "This week", "Earlier"] as const;
  const byLabel = new Map<string, NotificationResponse[]>();
  for (const label of order) byLabel.set(label, []);

  for (const row of rows) {
    if (!row.createdAt) {
      byLabel.get("Earlier")?.push(row);
      continue;
    }
    const stamp = new Date(row.createdAt);
    let label: (typeof order)[number];
    if (stamp >= today) label = "Today";
    else if (stamp >= yesterday) label = "Yesterday";
    else if (stamp >= oneWeekAgo) label = "This week";
    else label = "Earlier";
    byLabel.get(label)?.push(row);
  }

  return order
    .map((label) => ({ label, items: byLabel.get(label) ?? [] }))
    .filter((bucket) => bucket.items.length > 0);
}

/** Coarse, dependency-free relative time formatter. Avoids pulling date-fns
 *  in for one timestamp column — readers care about "5m ago" vs "yesterday",
 *  not millisecond precision. */
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

const DAY_MS = 24 * 60 * 60 * 1000;
function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export { NotificationDropdown };
