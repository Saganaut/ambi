import type { MouseEvent, ReactNode } from "react";

import styles from "./DeckCard.module.css";
import { DeckResponse } from "@store/AmbiApi";
import { type PublishStatus } from "@store/enums";
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
  className?: string;
  showFavoriteHeart?: boolean;
}

const StatusRow = ({ deck }: { deck: DeckResponse }) => {
  const status = deck.publishStatus;
  return (
    <span className={styles.statusRow}>
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
  className,
}: DeckCardProps) => {
  const classes = [styles.card, className].filter(Boolean).join(" ");
  return (
    <div className={classes} onClick={onClick} onContextMenu={onContextMenu}>
      <div className={styles.coverWrap}>
        <img
          src={resolveDeckCover(deck.coverImage, deck.id)}
          alt=''
          className={styles.cover}
          loading='lazy'
        />
      </div>

      <span className={styles.name}>{deck.name}</span>

      {variant === "full" && (
        <>
          <StatusRow deck={deck} />
          <CompactMeta deck={deck} />
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
  );
};

export { DeckCard };
export type { DeckCardVariant, DeckCardProps };
