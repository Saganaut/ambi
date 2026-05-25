// Heart-toggle button used on deck cards and the deck detail header. Calls
// the favorite / unfavorite mutations and lets `apiEnhancements.ts` handle
// the optimistic cache update — this component never owns the toggle state
// itself, it just renders whatever the cached `isFavorited` says.
//
// The button stops click propagation so it can sit inside a card link
// without navigating when the user taps the heart.
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import {
  useFavoriteDeckMutation,
  useUnfavoriteDeckMutation,
} from "@/store/BrainFlexApi";
import styles from "./FavoriteHeart.module.css";

interface FavoriteHeartProps {
  deckId: string;
  isFavorited: boolean;
  favoriteCount?: number;
  size?: "sm" | "md";
  showCount?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

const FavoriteHeart = ({
  deckId,
  isFavorited,
  favoriteCount,
  size = "md",
  showCount = false,
  disabled = false,
  ariaLabel,
}: FavoriteHeartProps) => {
  const [favoriteDeck, favoriteStatus] = useFavoriteDeckMutation();
  const [unfavoriteDeck, unfavoriteStatus] = useUnfavoriteDeckMutation();
  const inFlight = favoriteStatus.isLoading || unfavoriteStatus.isLoading;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || inFlight) return;
    if (isFavorited) {
      void unfavoriteDeck({ id: deckId });
    } else {
      void favoriteDeck({ id: deckId });
    }
  };

  const label =
    ariaLabel ?? (isFavorited ? "Remove from favorites" : "Add to favorites");
  const Icon = isFavorited ? HeartSolid : HeartOutline;

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={isFavorited}
      aria-label={label}
      title={label}
      className={[
        styles.heart,
        isFavorited && styles.heartActive,
        size === "sm" && styles.sizeSm,
      ]
        .filter(Boolean)
        .join(" ")}>
      <Icon className={styles.icon} />
      {showCount && favoriteCount != null && (
        <span className={styles.count}>{favoriteCount}</span>
      )}
    </button>
  );
};

export { FavoriteHeart };
