// Achievements tab on the account page — earned-only summary, newest first,
// with a link out to the full catalog at /achievements for the locked rows
// and progress bars. We deliberately keep this tab focused on "what you've
// already earned" so the profile surface stays celebratory; the catalog
// route handles the longer "what's still ahead" exploration.
import { Link } from "@tanstack/react-router";
import {
  type UserAchievementResponse,
  useListMyAchievementsQuery,
} from "../../store/AmbiApi";
import styles from "./AccountPage.module.css";

const AchievementsSection = () => {
  const { data, isFetching } = useListMyAchievementsQuery();

  const items = data?.items ?? [];
  const earnedItems = items
    .filter((row) => row.earned === true)
    .sort(byEarnedAtDesc);
  const total = data?.totalCount ?? 0;

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Achievements</h2>
          <p className={styles.sectionSubtitle}>
            {isFetching && items.length === 0
              ? "Loading…"
              : `${String(earnedItems.length)} of ${String(total)} earned`}
          </p>
        </div>
        <Link to='/achievements' className={styles.viewAllLink}>
          View catalog →
        </Link>
      </header>

      {earnedItems.length === 0 && !isFetching ? (
        <p className={styles.emptyState}>
          No achievements yet. Finish a game or publish a deck to earn your
          first badge.
        </p>
      ) : (
        <ul className={styles.achievementsList}>
          {earnedItems.map((row) => (
            <li key={row.id} className={styles.achievementRow}>
              <span className={styles.achievementBadge} aria-hidden='true'>
                ★
              </span>
              <div className={styles.achievementBody}>
                <h3 className={styles.achievementName}>{row.name ?? ""}</h3>
                <p className={styles.achievementDescription}>
                  {row.description ?? ""}
                </p>
              </div>
              <div className={styles.achievementMeta}>
                <span className={styles.achievementDate}>
                  {formatDate(row.earnedAt)}
                </span>
                {(row.rewardPoints ?? 0) > 0 && (
                  <span className={styles.achievementReward}>
                    +{row.rewardPoints} pts
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const byEarnedAtDesc = (
  a: UserAchievementResponse,
  b: UserAchievementResponse,
): number => {
  const ad = a.earnedAt ?? "";
  const bd = b.earnedAt ?? "";
  if (ad === bd) return 0;
  return bd.localeCompare(ad);
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

export { AchievementsSection };
