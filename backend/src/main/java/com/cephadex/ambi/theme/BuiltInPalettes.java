package com.cephadex.ambi.theme;

import java.util.LinkedHashMap;
import java.util.Map;

import com.cephadex.ambi.theme.enums.ThemeAppearance;

/**
 * The app-provided preset themes, defined as explicit palettes after the
 * popular VSCode / terminal colour schemes. These are seeded as built-in
 * {@link Theme} documents (see {@code SampleDataSeeder}) so the picker has a real
 * selection out of the box, and they double as reference data for the frontend.
 *
 * <p>Each palette names the 16 {@link Palette} roles directly; the frontend
 * derives the remaining semantic tokens. Colours are the canonical hex values
 * published by each scheme.
 *
 * <p><strong>The brand looks are deliberately absent.</strong> "Ambi Light" and
 * "Ambi Dark" are client-side defaults whose colours live in
 * {@code frontend/src/tokens.css}; a stored copy could only drift from the
 * stylesheet that actually paints the app. They are never persisted as themes —
 * see {@link Themes} for the reserved ids a deck may hold instead.
 */
public final class BuiltInPalettes {

    private BuiltInPalettes() {
    }

    /** Catppuccin Mocha — the dark flagship flavour. */
    public static final ThemeSpec CATPPUCCIN_MOCHA = new ThemeSpec(
            ThemeAppearance.DARK,
            new Palette(
                    "#1e1e2e", "#313244", "#45475a", "#181825",
                    "#cdd6f4", "#a6adc8",
                    "#cba6f7", "#1e1e2e", "#f5c2e7", "#89b4fa",
                    "#45475a", "#313244",
                    "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa"),
            null, null);

    /** Catppuccin Latte — the light flavour. */
    public static final ThemeSpec CATPPUCCIN_LATTE = new ThemeSpec(
            ThemeAppearance.LIGHT,
            new Palette(
                    "#eff1f5", "#e6e9ef", "#ffffff", "#dce0e8",
                    "#4c4f69", "#6c6f85",
                    "#8839ef", "#eff1f5", "#ea76cb", "#1e66f5",
                    "#bcc0cc", "#ccd0da",
                    "#d20f39", "#40a02b", "#df8e1d", "#1e66f5"),
            null, null);

    /** Dracula — the classic dark scheme. */
    public static final ThemeSpec DRACULA = new ThemeSpec(
            ThemeAppearance.DARK,
            new Palette(
                    "#282a36", "#343746", "#44475a", "#21222c",
                    "#f8f8f2", "#6272a4",
                    "#bd93f9", "#282a36", "#ff79c6", "#8be9fd",
                    "#44475a", "#383a4a",
                    "#ff5555", "#50fa7b", "#f1fa8c", "#8be9fd"),
            null, null);

    /** One Dark — Atom's signature dark theme. */
    public static final ThemeSpec ONE_DARK = new ThemeSpec(
            ThemeAppearance.DARK,
            new Palette(
                    "#282c34", "#2c313a", "#3b4048", "#21252b",
                    "#abb2bf", "#5c6370",
                    "#61afef", "#282c34", "#c678dd", "#56b6c2",
                    "#3b4048", "#2c313a",
                    "#e06c75", "#98c379", "#e5c07b", "#61afef"),
            null, null);

    /** Gruvbox Dark — warm, retro dark scheme. */
    public static final ThemeSpec GRUVBOX_DARK = new ThemeSpec(
            ThemeAppearance.DARK,
            new Palette(
                    "#282828", "#3c3836", "#504945", "#1d2021",
                    "#ebdbb2", "#928374",
                    "#fe8019", "#282828", "#8ec07c", "#d3869b",
                    "#504945", "#3c3836",
                    "#fb4934", "#b8bb26", "#fabd2f", "#83a598"),
            null, null);

    /** Gruvbox Light — warm, retro light scheme. */
    public static final ThemeSpec GRUVBOX_LIGHT = new ThemeSpec(
            ThemeAppearance.LIGHT,
            new Palette(
                    "#fbf1c7", "#f2e5bc", "#ffffff", "#ebdbb2",
                    "#3c3836", "#7c6f64",
                    "#af3a03", "#fbf1c7", "#427b58", "#8f3f71",
                    "#d5c4a1", "#ebdbb2",
                    "#9d0006", "#79740e", "#b57614", "#076678"),
            null, null);

    /**
     * The presets keyed by display name, in picker order. {@link LinkedHashMap}
     * preserves the ordering for a stable built-in list.
     */
    public static Map<String, ThemeSpec> all() {
        Map<String, ThemeSpec> presets = new LinkedHashMap<>();
        presets.put("Catppuccin Mocha", CATPPUCCIN_MOCHA);
        presets.put("Catppuccin Latte", CATPPUCCIN_LATTE);
        presets.put("Dracula", DRACULA);
        presets.put("One Dark", ONE_DARK);
        presets.put("Gruvbox Dark", GRUVBOX_DARK);
        presets.put("Gruvbox Light", GRUVBOX_LIGHT);
        return presets;
    }
}
