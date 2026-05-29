// Shared deck card primitive used by MyDecksPage, ExplorePage, and
// FavoritesPage. Each page used to hand-roll its own near-identical card; this
// component consolidates the cover + favorite-heart + name layout and exposes
// `variant` to pick which metadata blocks render. Callers compose actions via
// the `actions` slot so page-specific affordances (edit/delete, play split
// button) stay in their pages without forking the visual shell.
import type { MouseEvent, ReactNode } from "react";
import { PlayIcon, StarIcon } from "@heroicons/react/24/outline";
import type { DeckResponse } from "@/store/AmbiApi";
import { Badge } from "@/components/Common/Badge";
import { FavoriteHeart } from "@/components/Common/FavoriteHeart/FavoriteHeart";
import { Tag } from "@/components/Common/Tag/Tag";
import { resolveDeckCover } from "@/utils/deckImages";
import styles from "./DeckCard.module.css";

const PUBLISH_BADGE_VARIANT = {
  DRAFT: "info",
  PUBLISHED: "success",
  ARCHIVED: "warning",
} as const;

const ROLE_BADGE_VARIANT = {
  OWNER: "brand",
  EDITOR: "success",
  VIEWER: "info",
} as const;

const ROLE_BADGE_LABEL = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;

const DIFFICULTY_LABEL = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
} as const;

const formatRating = (rating: number, count: number): string => {
  if (count <= 0) return "—";
  return rating.toFixed(1);
};

type DeckCardVariant = "full" | "discovery" | "compact";

interface DeckCardProps {
  deck: DeckResponse;
  variant?: DeckCardVariant;
  actions?: ReactNode;
  onClick?: () => void;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
  className?: string;
  showFavoriteHeart?: boolean;
}

const StatusRow = ({ deck }: { deck: DeckResponse }) => {
  if (deck.isSystem) {
    return <Badge size='sm' variant='brand' label='Template' />;
  }
  const status = deck.publishStatus ?? "DRAFT";
  const role = deck.myRole;
  return (
    <span className={styles.statusRow}>
      <Badge
        size='sm'
        variant={PUBLISH_BADGE_VARIANT[status]}
        label={status.charAt(0) + status.slice(1).toLowerCase()}
      />
      {role && role !== "OWNER" && (
        <Badge
          size='sm'
          variant={ROLE_BADGE_VARIANT[role]}
          label={ROLE_BADGE_LABEL[role]}
        />
      )}
    </span>
  );
};

const DiscoveryRow = ({ deck }: { deck: DeckResponse }) => {
  const plays = deck.playCount ?? 0;
  const rating = deck.averageRating ?? 0;
  const ratingCount = deck.ratingCount ?? 0;
  const language = deck.language ?? "en";
  const difficulty = deck.difficulty ?? "MEDIUM";

  return (
    <span className={styles.discovery}>
      <span className={styles.discoveryItem} aria-label='Plays'>
        <PlayIcon className={styles.icon} />
        {plays}
      </span>
      <span className={styles.discoveryItem} aria-label='Average rating'>
        <StarIcon className={styles.icon} />
        {formatRating(rating, ratingCount)}
      </span>
      <span className={styles.discoveryItem} aria-label='Language'>
        {language.toUpperCase()}
      </span>
      <span className={styles.discoveryItem} aria-label='Difficulty'>
        {DIFFICULTY_LABEL[difficulty]}
      </span>
    </span>
  );
};

const CompactMeta = ({ deck }: { deck: DeckResponse }) => (
  <span className={styles.meta}>
    {deck.elementCount ?? 0} elements
    {deck.tags && deck.tags.length > 0 ? ` · ${deck.tags[0]}` : ""}
  </span>
);

const DeckCard = ({
  deck,
  variant = "compact",
  actions,
  onClick,
  onContextMenu,
  className,
  showFavoriteHeart = true,
}: DeckCardProps) => {
  const classes = [styles.card, className].filter(Boolean).join(" ");
  return (
    <div className={classes} onClick={onClick} onContextMenu={onContextMenu}>
      <div className={styles.coverWrap}>
        <img
          src={resolveDeckCover(deck.cover, deck.id)}
          alt=''
          className={styles.cover}
          loading='lazy'
        />
        {showFavoriteHeart && deck.id != null && deck.id !== "" && (
          <span className={styles.heart}>
            <FavoriteHeart
              deckId={deck.id}
              isFavorited={deck.isFavorited ?? false}
              favoriteCount={deck.favoriteCount}
              showCount
              size='sm'
            />
          </span>
        )}
      </div>

      <span className={styles.name}>{deck.name}</span>

      {variant === "full" && (
        <>
          <StatusRow deck={deck} />
          <CompactMeta deck={deck} />
          <DiscoveryRow deck={deck} />
          {deck.description != null && deck.description !== "" && (
            <span className={styles.desc}>{deck.description}</span>
          )}
        </>
      )}

      {variant === "discovery" && (
        <>
          {deck.description != null && deck.description !== "" && (
            <span className={styles.desc}>{deck.description}</span>
          )}
          <DiscoveryRow deck={deck} />
          {deck.tags && deck.tags.length > 0 && (
            <div className={styles.tags}>
              {deck.tags.slice(0, 3).map((t) => (
                <Tag key={t} size='sm'>
                  {t}
                </Tag>
              ))}
            </div>
          )}
        </>
      )}

      {variant === "compact" && <CompactMeta deck={deck} />}

      {actions != null && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};

export { DeckCard };
export type { DeckCardVariant, DeckCardProps };
