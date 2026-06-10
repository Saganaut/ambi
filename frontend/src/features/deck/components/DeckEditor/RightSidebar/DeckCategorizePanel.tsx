// Deck-level metadata panel for the right-sidebar inspector.
//
// Tags are a deck-level concern (`DeckResponse.tags: string[]` — tag *names*,
// not entities and not per-slide). The whole set is replaced in one shot via
// `PUT /api/decks/{id}/tags` (`useSetDeckTagsMutation`); the deck enhancement
// optimistically patches `getDeck` so chips appear/disappear instantly and
// reconciles from the response. Entry + count caps come from the generated
// bounds (`deckValidation.SetTagsRequest.tags`), so the backend stays the single
// source of truth for the 50-tag / 50-char-per-tag limits.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useGetDeckQuery, useSetDeckTagsMutation } from "@deck/store/deckApi.gen";
import { deckValidation } from "@deck/store/deckValidationConstants";
import { validateText } from "@utils/fieldValidation";
import { Input } from "@/shared/components/Forms/Input/Input/Input";
import { IconBtn } from "@ui/Buttons/IconBtn";

import styles from "./DeckCategorizePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const TAGS_FACETS = deckValidation.SetTagsRequest.tags;
const ITEM_FACETS = TAGS_FACETS.items;

const useDeckTags = () => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  const [setDeckTags, { isLoading: isSaving }] = useSetDeckTagsMutation();

  const tags = deck?.tags ?? [];

  const commit = (next: string[]) => {
    void setDeckTags({ id: deckId, setTagsRequest: { tags: next } });
  };

  return { isLoaded: deck != null, tags, commit, isSaving };
};

const DeckCategorizePanel = () => {
  const { isLoaded, tags, commit, isSaving } = useDeckTags();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className={styles.panel}>
        <p className={styles.empty}>Loading deck…</p>
      </div>
    );
  }

  const atMax = tags.length >= TAGS_FACETS.maxItems;

  const addTag = () => {
    const value = draft.trim();
    const itemError = validateText(value, ITEM_FACETS, {
      required: true,
      label: "Tag",
    });
    if (itemError) {
      setError(itemError);
      return;
    }
    if (tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setError("That tag is already added");
      return;
    }
    if (atMax) {
      setError(`Up to ${TAGS_FACETS.maxItems} tags`);
      return;
    }
    commit([...tags, value]);
    setDraft("");
    setError(null);
  };

  const removeTag = (tag: string) => {
    commit(tags.filter((existing) => existing !== tag));
  };

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h4 className={styles.heading}>Deck tags</h4>

        {tags.length > 0 ? (
          <ul className={styles.tagList}>
            {tags.map((tag) => (
              <li key={tag} className={styles.tag}>
                <span className={styles.tagLabel}>{tag}</span>
                <IconBtn
                  fill='ghost'
                  size='sm'
                  icon={<XMarkIcon className={styles.tagRemoveIcon} />}
                  aria-label={`Remove tag ${tag}`}
                  disabled={isSaving}
                  onClick={() => {
                    removeTag(tag);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No tags yet.</p>
        )}

        <div className={styles.addRow}>
          <Input
            ariaLabel='Add a tag'
            placeholder={atMax ? "Tag limit reached" : "Add a tag…"}
            value={draft}
            maxLength={ITEM_FACETS.maxLength}
            disabled={atMax}
            errorMessage={error ?? undefined}
            fullWidth
            withPadding={false}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
        </div>

        <p className={styles.count}>
          {tags.length} / {TAGS_FACETS.maxItems} tags · press Enter to add
        </p>
      </section>
    </div>
  );
};

export { DeckCategorizePanel };
