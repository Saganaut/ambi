// Resolves a deck's theme (by id) into the props needed to paint a scoped
// subtree with it — the per-deck layer that supersedes the global theme on the
// authoring/presentation surfaces. Spread `style` onto a wrapper and pass
// `appearance` as its `data-appearance`; tokens.css derives everything from
// there. When the deck has no theme (or it hasn't loaded), `style`/`appearance`
// are undefined and the subtree keeps the inherited (global) theme.
//
// The resolved `theme` is returned alongside so a caller that also needs its
// name (the deck inspector) doesn't re-fetch it. The two default themes have no
// server representation, so their ids resolve locally and skip the query.
import { useGetThemeQuery } from "@features/theme/store/themeApi.gen";
import { defaultThemeById } from "@features/theme/defaultThemes";
import { appearanceValue, paletteStyle } from "@/shared/utils/applyPalette";

export function useDeckTheme(themeId?: string) {
  const defaultTheme = defaultThemeById(themeId);
  const { data: fetchedTheme } = useGetThemeQuery(
    { id: themeId ?? "" },
    { skip: !themeId || defaultTheme != null },
  );
  const theme = defaultTheme ?? fetchedTheme;
  const spec = theme?.spec;
  return {
    theme,
    spec,
    style: paletteStyle(spec),
    appearance: appearanceValue(spec),
  };
}
