// Per-slide content image picker. Moved here from ThemePanel's PerSlideStyle
// (the deck background stays in ThemePanel as a styling concern; the content
// image is part of the slide's content, so it belongs in the edit-slide panel).
// Every DeckElement kind carries `chrome.image`, so this mounts for any
// selected element and is hidden only when nothing is selected. Commits flow
// through useElementEditor, which stamps chrome version/author like every other
// edit-slide section.
import { getRouteApi } from "@tanstack/react-router";
import { emptyImage } from "@utils/image";
import type { DeckResponse } from "@store/AmbiApi";
import { useElementEditor } from "../../SlideContentTypes/useElementEditor";
import { ImagePicker } from "../ImagePicker";
import styles from "../EditSlidePanel.module.css";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

// useElementEditor requires a type predicate to narrow the union. The content
// image is shared by every kind, so this is a tautology that just satisfies
// the signature.
const anyElement = (_e: DeckElement): _e is DeckElement => true;

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const SlideImageSection = () => {
  // Touch the route so the section is bound to the active deck/slide the same
  // way its siblings are (useElementEditor reads the same params/search).
  routeApi.useParams();
  const { element, commit, syncedFromId, markSynced } =
    useElementEditor<DeckElement>(anyElement);

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
  }

  if (!element) return null;

  // TODO(migration): the gallery picker was wired through `@hooks/useGalleryPicker`,
  // which no longer exists. No-op until the picker returns.
  const handlePick = () => {};

  const handleClear = () => {
    commit({ ...element, chrome: { ...element.chrome, image: emptyImage() } });
  };

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Content image</h4>
      <ImagePicker
        label='Content image'
        image={element.chrome?.image}
        seed={`${elId}-content`}
        onPick={handlePick}
        onClear={handleClear}
      />
    </section>
  );
};

export { SlideImageSection };
