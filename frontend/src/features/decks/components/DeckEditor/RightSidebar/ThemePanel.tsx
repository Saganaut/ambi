// Style panel for the deck-editor right sidebar. Two scopes:
//   1. Deck-wide theme — a single Dropdown collapsing the preset list +
//      the user's custom themes into one compact control. "+ New theme"
//      opens the shared ThemeEditor modal.
//   2. Per-element background image (element.background) — the deck's themed
//      backdrop, a styling concern. It goes through useGalleryPicker so the
//      full Image record (useExternalImg / internalImgId / variants) is
//      what's committed; the backend strips imgUrl on write and rehydrates
//      variants on read. The per-slide *content* image moved to the edit-slide
//      panel (SlideImageSection) since it's slide content, not styling.
//
// Every DeckElement kind carries `background` on the shared interface, so the
// per-element block mounts for any selected element. It's only hidden when no
// element is selected (e.g. the deck editor is open without a focused slide in
// the route).
import { getRouteApi } from "@tanstack/react-router";
import {
  useGetDeckQuery,
  useUpdateDeckMutation,
  type DeckResponse,
  type ThemeResponse,
} from "@store/AmbiApi";
import { useElementEditor } from "../SlideContentTypes/useElementEditor";
import { emptyImage } from "@utils/image";
import { Btn } from "@common/Buttons/Btn";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { ImagePicker } from "./ImagePicker";
import styles from "./ThemePanel.module.css";

const routeApi = getRouteApi("/decks/$deckId/edit");

type SessionFormat = NonNullable<DeckResponse["defaultSessionFormat"]>;
type ShowResponsesMode = NonNullable<DeckResponse["defaultShowResponses"]>;

const FORMAT_OPTIONS: { value: SessionFormat; label: string }[] = [
  { value: "GAME", label: "Game" },
  { value: "PRESENTATION", label: "Presentation" },
];

const SHOW_RESPONSES_OPTIONS: { value: ShowResponsesMode; label: string }[] = [
  { value: "INHERIT", label: "Inherit (per-element)" },
  { value: "INSTANT", label: "Instant" },
  { value: "ON_CLICK", label: "On click" },
  { value: "PRIVATE", label: "Private" },
];

const PRESET_PREFIX = "preset:";
const THEME_PREFIX = "theme:";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

// useElementEditor requires a type predicate to narrow the union. Since the
// section applies to every kind, this is a tautology that just satisfies the
// signature.
const anyElement = (_e: DeckElement): _e is DeckElement => true;

const PerSlideStyle = () => {
  const { element, commit, syncedFromId, markSynced } =
    useElementEditor<DeckElement>(anyElement);
  const openPicker = useGalleryPicker();

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
  }

  if (!element) return <div>No element found</div>;

  // Spreading a discriminated union and overriding shared fields keeps the
  // `kind` discriminator intact, but TS can't prove that for the union
  // member type, so the cast is required on the way out.
  const handlePickBackground = () => {
    openPicker((background) => {
      commit({ ...element, chrome: { ...element.chrome, background } });
    });
  };

  const handleClearBackground = () => {
    commit({
      ...element,
      chrome: { ...element.chrome, background: emptyImage() },
    });
  };

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>This slide</h4>
      <ImagePicker
        label='Background image'
        image={element.chrome?.background}
        seed={`${elId}-background`}
        onPick={handlePickBackground}
        onClear={handleClearBackground}
      />
    </section>
  );
};

const ThemePanel = () => {
  const {
    presets,
    themes,
    activeThemeId,
    customPresetActive,
    activatePreset,
    activateCustom,
    openEditor,
  } = useThemePicker();

  const options = [
    ...presets.map((preset) => ({
      value: `${PRESET_PREFIX}${preset.label}`,
      label: preset.label,
    })),
    ...themes
      .filter((t): t is ThemeResponse & { id: string } => !!t.id)
      .map((theme) => ({
        value: `${THEME_PREFIX}${theme.id}`,
        label: theme.name ?? "Untitled",
      })),
  ];

  // No clean preset match when the user has hand-tweaked hues away from any
  // preset — show the dropdown empty in that case so we don't misrepresent.
  let selected: string[] = [];
  if (activeThemeId) {
    selected = [`${THEME_PREFIX}${activeThemeId}`];
  } else if (!customPresetActive) {
    selected = [`${PRESET_PREFIX}Brand`];
  }

  const handleChange = (vals: string[]) => {
    const v = vals[0];
    if (!v) return;
    if (v.startsWith(PRESET_PREFIX)) {
      const label = v.slice(PRESET_PREFIX.length);
      const preset = presets.find((p) => p.label === label);
      if (preset) void activatePreset(preset);
      return;
    }
    if (v.startsWith(THEME_PREFIX)) {
      const id = v.slice(THEME_PREFIX.length);
      const theme = themes.find((t) => t.id === id);
      if (theme) void activateCustom(theme);
    }
  };

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h4 className={styles.heading}>Deck theme</h4>
        <Dropdown
          options={options}
          value={selected}
          onChange={handleChange}
          placeholder='Custom (hand-tweaked)'
        />
        <Btn
          type='button'
          className={styles.newBtn}
          onClick={() => {
            openEditor();
          }}>
          + New theme
        </Btn>
      </section>

      <SessionDefaultsSection />

      <PerSlideStyle />
    </div>
  );
};

/**
 * Chunk 24 — deck-wide chrome defaults. The values written here feed the
 * top of the runtime cascade: `defaultSessionFormat` pre-fills the host's
 * format picker on CreateGamePage; `defaultShowResponses` defers to the
 * per-element value unless the deck wants to pin a value (e.g. an "always
 * private" poll deck). The host can still override both at start-time —
 * neither is a constraint.
 */
const SessionDefaultsSection = () => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  const [updateDeck] = useUpdateDeckMutation();

  if (!deck) return null;

  const format: SessionFormat = deck.defaultSessionFormat ?? "GAME";
  const showResponses: ShowResponsesMode =
    deck.defaultShowResponses ?? "INHERIT";

  const commitFormat = (next: SessionFormat) => {
    void updateDeck({
      id: deckId,
      updateDeckRequest: { defaultSessionFormat: next },
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update defaultSessionFormat", err);
      });
  };

  const commitShowResponses = (next: ShowResponsesMode) => {
    void updateDeck({
      id: deckId,
      updateDeckRequest: { defaultShowResponses: next },
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update defaultShowResponses", err);
      });
  };

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Session defaults</h4>
      <Dropdown
        options={FORMAT_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }))}
        value={[format]}
        onChange={(values) => {
          const next = values[0] as SessionFormat | undefined;
          if (next && next !== format) commitFormat(next);
        }}
      />
      <Dropdown
        options={SHOW_RESPONSES_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }))}
        value={[showResponses]}
        onChange={(values) => {
          const next = values[0] as ShowResponsesMode | undefined;
          if (next && next !== showResponses) commitShowResponses(next);
        }}
      />
    </section>
  );
};

export { ThemePanel };
