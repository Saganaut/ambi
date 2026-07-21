// Shared deck card primitive (Ambi DS "Deck Card"): full-bleed cover with the
// publish-status badge overlaid, then a padded body whose blocks vary by
// variant — "full" (My Decks), "discovery" (Explore), "compact" (lists).
import type { MouseEvent, ReactNode } from "react";

import styles from "./DeckCard.module.css";
import { DeckResponse } from "@deck/store/deckApi.gen";
import { type PublishStatus } from "@deck/store/deckEnums.gen";
import { Badge } from "@ui/Badge/Badge";
import { Tag } from "@ui/Tag/Tag";
import { resolveDeckCover } from "@shared/utils/deckImages";

const PUBLISH_BADGE_VARIANT = {
  DRAFT: "info",
  PUBLISHED: "success",
  ARCHIVED: "warning",
} as const satisfies Record<PublishStatus, string>;

type DeckCardVariant = "full" | "discovery" | "compact";

interface DeckCardProps {
  deck: DeckResponse;
  variant?: DeckCardVariant;
  actions?: ReactNode;
  onClick?: () => void;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  className?: string;
  showFavoriteHeart?: boolean;
}

const StatusBadge = ({ deck }: { deck: DeckResponse }) => {
  const status = deck.publishStatus;
  return (
    <span className={styles.coverBadge}>
      <Badge
        size='sm'
        variant={PUBLISH_BADGE_VARIANT[status]}
        label={status.charAt(0) + status.slice(1).toLowerCase()}
      />
    </span>
  );
};

const CompactMeta = ({ deck }: { deck: DeckResponse }) => (
  <span className={styles.meta}>
    {deck.tags.length > 0 ? ` · ${deck.tags[0]}` : ""}
  </span>
);

const DeckCard = ({
  deck,
  variant = "compact",
  actions,
  onClick,
  onContextMenu,
  onMouseEnter,
  onFocus,
  className,
}: DeckCardProps) => {
  const classes = [styles.card, className].filter(Boolean).join(" ");
  return (
    <div
      className={classes}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}>
      <div className={styles.coverWrap}>
        <img
          src={resolveDeckCover(deck.coverImage, deck.id)}
          alt=''
          className={styles.cover}
          loading='lazy'
        />
        {variant === "full" && <StatusBadge deck={deck} />}
      </div>

      <div className={styles.body}>
        <span className={styles.name}>{deck.name}</span>

        {variant === "full" && (
          <>
            {deck.tags.length > 0 && (
              <div className={styles.metaRow}>
                <Tag size='sm'>{deck.tags[0]}</Tag>
              </div>
            )}
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
            {deck.tags.length > 0 && (
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
    </div>
  );
};

export { DeckCard };
export type { DeckCardVariant, DeckCardProps };
