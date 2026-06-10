// Resolves a deck's theme (by id) into the props needed to paint a scoped
// subtree with it — the per-deck layer that supersedes the global theme on the
// authoring/presentation surfaces. Spread `style` onto a wrapper and pass
// `appearance` as its `data-appearance`; tokens.css derives everything from
// there. When the deck has no theme (or it hasn't loaded), `style`/`appearance`
// are undefined and the subtree keeps the inherited (global) theme.
import { useGetThemeQuery } from "@features/theme/store/themeApi.gen";
import { appearanceValue, paletteStyle } from "@/shared/utils/applyPalette";

export function useDeckTheme(themeId?: string) {
  const { data: theme } = useGetThemeQuery(
    { id: themeId ?? "" },
    { skip: !themeId },
  );
  const spec = theme?.spec;
  return {
    spec,
    style: paletteStyle(spec),
    appearance: appearanceValue(spec),
  };
}
