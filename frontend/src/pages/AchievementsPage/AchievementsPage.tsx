// /achievements — full achievement catalog for the signed-in caller. Each
// card shows earned/locked state, a description, the reward point payout,
// and (for locked rows) a progress bar against the threshold. Hidden
// achievements that aren't yet earned render as a masked "???" card; once
// earned, the row reveals like any other.
//
// The data shape comes from `GET /api/users/me/achievements` — earned rows
// carry `earnedAt`, and `currentProgress` is best-effort: triggers that
// require expensive aggregation (streaks, perfect games) report 0, which we
// render as a neutral "not started" bar.
import {
  type UserAchievementResponse,
  useListMyAchievementsQuery,
} from "@/store/BrainFlexApi";
import styles from "./AchievementsPage.module.css";

const AchievementsPage = () => {
  // /_authenticated guarantees a registered caller is in context.
  const { data, isFetching } = useListMyAchievementsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const items = data?.items ?? [];
  const earned = data?.earnedCount ?? 0;
  const total = data?.totalCount ?? 0;

  // Group by category so similar achievements cluster — the catalog has
  // starter / scoring / host / creator / social buckets seeded in
  // SampleDataSeeder.ensureAchievementCatalog.
  const grouped = groupByCategory(items);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Achievements</h1>
          <p className={styles.subtitle}>
            {isFetching && items.length === 0
              ? "Loading…"
              : `${String(earned)} of ${String(total)} earned`}
          </p>
        </div>
      </header>

      {items.length === 0 && !isFetching ? (
        <p className={styles.empty}>
          No achievements available yet — check back once the catalog is seeded.
        </p>
      ) : (
        grouped.map(([category, rows]) => (
          <section key={category} className={styles.section}>
            <h2 className={styles.sectionTitle}>{prettyCategory(category)}</h2>
            <div className={styles.grid}>
              {rows.map((row) => (
                <AchievementCard key={row.id} row={row} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

const AchievementCard = ({ row }: { row: UserAchievementResponse }) => {
  const threshold = row.threshold ?? 0;
  const progress = row.currentProgress ?? 0;
  const ratio = threshold > 0 ? Math.min(1, progress / threshold) : 0;
  const isEarned = row.earned === true;

  return (
    <article
      className={`${styles.card} ${isEarned ? styles.cardEarned : styles.cardLocked}`}
      aria-label={`${row.name ?? ""}: ${isEarned ? "earned" : "locked"}`}>
      <div className={styles.cardHead}>
        <span
          className={`${styles.badge} ${isEarned ? styles.badgeEarned : styles.badgeLocked}`}
          aria-hidden='true'>
          {isEarned ? "★" : "✦"}
        </span>
        <div className={styles.cardText}>
          <h3 className={styles.cardName}>{row.name ?? "—"}</h3>
          <p className={styles.cardDescription}>{row.description ?? ""}</p>
        </div>
      </div>

      {!isEarned && threshold > 0 && (
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${String(Math.round(ratio * 100))}%` }}
              role='progressbar'
              aria-valuemin={0}
              aria-valuemax={threshold}
              aria-valuenow={progress}
            />
          </div>
          <span className={styles.progressLabel}>
            {progress.toLocaleString()} / {threshold.toLocaleString()}
          </span>
        </div>
      )}

      <footer className={styles.cardFoot}>
        {isEarned ? (
          <span className={styles.earnedLabel}>
            Earned {formatDate(row.earnedAt)}
          </span>
        ) : (
          <span className={styles.lockedLabel}>Locked</span>
        )}
        {(row.rewardPoints ?? 0) > 0 && (
          <span className={styles.reward}>+{row.rewardPoints} pts</span>
        )}
      </footer>
    </article>
  );
};

// ---- helpers ----

const CATEGORY_ORDER: Record<string, number> = {
  starter: 0,
  scoring: 1,
  host: 2,
  creator: 3,
  social: 4,
};

const groupByCategory = (
  items: UserAchievementResponse[],
): [string, UserAchievementResponse[]][] => {
  const byCategory = new Map<string, UserAchievementResponse[]>();
  for (const item of items) {
    const key = item.category ?? "other";
    const bucket = byCategory.get(key) ?? [];
    bucket.push(item);
    byCategory.set(key, bucket);
  }
  return Array.from(byCategory.entries()).sort((a, b) => {
    const ai = CATEGORY_ORDER[a[0]] ?? 99;
    const bi = CATEGORY_ORDER[b[0]] ?? 99;
    return ai - bi;
  });
};

const prettyCategory = (key: string): string => {
  if (!key) return "Other";
  return key.charAt(0).toUpperCase() + key.slice(1);
};

const formatDate = (iso: string | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export { AchievementsPage };
