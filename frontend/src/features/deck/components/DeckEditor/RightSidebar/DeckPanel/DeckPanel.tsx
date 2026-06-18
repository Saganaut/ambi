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
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useSetDeckTagsMutation } from "@deck/store/deckApi.gen";
import { deckValidation } from "@deck/store/deckValidationConstants";
import { validateText } from "@utils/fieldValidation";
import { Input } from "@/shared/components/Forms/Input/Input/Input";
import { IconBtn } from "@ui/Buttons/IconBtn";
import styles from "./DeckPanel.module.css";
import { ImagePicker } from "../shared/ImagePicker";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useDeckMutate } from "@/features/deck/hooks/useDeckMutate";
import { useDeckQuery } from "@/features/deck/hooks/useDeckQuery";
import { useDeckImageMutate } from "@/features/deck/hooks/useDeckImageMutate";
import { useGetThemeQuery } from "@/features/theme/store/themeApi.gen";
import { ThemeModal } from "@/shared/components/Theme/ThemeModal/ThemeModal";
import { Btn } from "@/shared/components/UIElements/Buttons/Btn";
import { useModal } from "@/shared/hooks/useModal";
import { ThemeColorSwatches } from "@/shared/components/Forms/Input/ColorPicker/ThemeColorSwatches";
import { Reviews } from "./Reviews";

const TAGS_FACETS = deckValidation.SetTagsRequest.tags;
const ITEM_FACETS = TAGS_FACETS.items;

const useDeckTags = (deckId: string) => {
  const { deck } = useDeckQuery(deckId);
  const [setDeckTags, { isLoading: isSaving }] = useSetDeckTagsMutation();
  const tags = deck?.tags ?? [];
  const commit = (next: string[]) => {
    void setDeckTags({ id: deckId, setTagsRequest: { tags: next } });
  };
  return { isLoaded: deck != null, tags, commit, isSaving, deckId };
};



const DeckTheme = ({ deckId }: { deckId: string }) => {
  const { deck } = useDeckQuery(deckId);
  const { updateDeck } = useDeckMutate(deckId);
  const { openModal, closeModal } = useModal();

  const themeId = deck?.themeId;
  // Resolve the applied theme's name for the summary line; skipped when unset.
  const { data: activeTheme } = useGetThemeQuery(
    { id: themeId ?? "" },
    { skip: !themeId },
  );

  // The deck PATCH is a full metadata replace (an omitted field is cleared), so
  // we resend the rest of the metadata alongside the theme change — both when
  // applying a theme and when clearing it back to the deck's (global) default.
  const setDeckTheme = (nextThemeId?: string) => {
    if (!deck) return;
    updateDeck({
      name: deck.name,
      description: deck.description,
      language: deck.language,
      publishStatus: deck.publishStatus,
      themeId: nextThemeId,
    });
  };

  const openThemeModal = () => {
    openModal({
      title: "Theme",
      content: (
        <ThemeModal
          activeThemeId={themeId}
          onApply={(theme) => {
            setDeckTheme(theme.id);
          }}
          onClose={closeModal}
        />
      ),
    });
  };

  return (
    <section className={styles.section}>
      <p className={styles.empty}>
        {themeId ? (activeTheme?.name ?? "Custom theme") : "No theme applied."}
      </p>
      {themeId && <div className={styles.themeColors}><ThemeColorSwatches
        preventFocusSteal
      /></div>}
      <Btn type='button' className={styles.newBtn} onClick={openThemeModal}>
        {themeId ? "Change theme" : "Choose theme"}
      </Btn>
    </section>
  );
};


const DeckImages = ({ deckId }: { deckId: string }) => {
  const { deck } = useDeckQuery(deckId);
  const { setDeckImage, clearDeckImage } = useDeckImageMutate(deckId);
  const openPicker = useGalleryPicker();

  return (
    <section className={styles.section}>
      <ImagePicker
        label=''
        image={deck?.coverImage}
        seed={`ambi-deck-cover-${deckId}`}
        placeholderText={"Deck cover"}
        onPick={() => {
          openPicker((img) => setDeckImage("cover", img), {
            title: "Deck cover image",
            cropWidth: 16,
            cropHeight: 9,
          });
        }}
        onClear={() => clearDeckImage("cover")}
      />
    </section>
  );
};




const DeckPanel = ({ deckId }: { deckId: string }) => {
  const { isLoaded, tags, commit, isSaving } = useDeckTags(deckId);
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
      <DeckImages deckId={deckId} />
      <section className={styles.section}>
        {tags.length > 0 && (
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
        <DeckTheme deckId={deckId} />
      </section>
      <section className={styles.section}>
        <Reviews deckId={deckId} />
      </section>
    </div>
  );
};

export { DeckPanel };
