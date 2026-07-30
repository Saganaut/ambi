package com.cephadex.ambi.theme;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

/**
 * Guards the curated built-in palette data. These presets are seeded as the
 * out-of-the-box theme selection, so a missing or typo'd colour would ship a
 * half-painted theme. Every preset must name an appearance and fill all 16
 * {@link Palette} roles with a plausible CSS colour.
 */
class BuiltInPalettesTest {

    @Test
    void allPresetsAreCompleteAndWellFormed() {
        Map<String, ThemeSpec> presets = BuiltInPalettes.all();

        assertThat(presets).hasSize(6);
        assertThat(presets).containsKeys(
                "Catppuccin Mocha", "Catppuccin Latte", "Dracula",
                "One Dark", "Gruvbox Dark", "Gruvbox Light");

        presets.forEach((name, spec) -> {
            assertThat(spec.appearance())
                    .as("appearance for %s", name)
                    .isNotNull();
            Palette p = spec.palette();
            assertThat(p).as("palette for %s", name).isNotNull();

            // Every role must be a non-blank, syntactically plausible colour.
            for (String role : roles(p)) {
                assertThat(role)
                        .as("a colour role in %s", name)
                        .isNotBlank()
                        .matches("#[0-9a-fA-F]{3,8}");
            }
        });
    }

    /**
     * The brand looks are client-side themes painted from tokens.css; a stored
     * copy could only drift from it, so no persisted preset may claim the name.
     */
    @Test
    void noPresetIsABrandDefault() {
        assertThat(BuiltInPalettes.all().keySet())
                .noneMatch(name -> name.startsWith("Ambi"));
    }

    private static String[] roles(Palette p) {
        return new String[] {
                p.canvas(), p.surface(), p.surfaceRaised(), p.subtle(),
                p.foreground(), p.mutedForeground(),
                p.primary(), p.onPrimary(), p.accent(), p.accentSecondary(),
                p.border(), p.borderSubtle(),
                p.red(), p.green(), p.yellow(), p.blue(),
        };
    }
}
