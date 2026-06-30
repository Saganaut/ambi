package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.DeckSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;

class SettingsTest {

    private static final AnswerSettings DECK_DEFAULTS =
            new AnswerSettings(ResultsDisplayMode.MANUAL, false, false, false, 0, true, 1);
    private static final AnswerSettings SLIDE_OVERRIDE =
            new AnswerSettings(ResultsDisplayMode.IMMEDIATE, false, false, false, 0, false, 2);

    private static final DeckSettings DECK = new DeckSettings(null, DECK_DEFAULTS, null, null);

    @Test
    void slideOverrideWinsOverDeckDefaults() {
        assertThat(Settings.effectiveAnswerSettings(DECK, new SlideSettings(null, SLIDE_OVERRIDE)))
                .isEqualTo(SLIDE_OVERRIDE);
    }

    @Test
    void fallsBackToDeckDefaultsWhenSlideHasNoAnswerSettings() {
        assertThat(Settings.effectiveAnswerSettings(DECK, new SlideSettings(null, null)))
                .isEqualTo(DECK_DEFAULTS);
        assertThat(Settings.effectiveAnswerSettings(DECK, null)).isEqualTo(DECK_DEFAULTS);
    }

    @Test
    void nullWhenNeitherIsSet() {
        assertThat(Settings.effectiveAnswerSettings(null, null)).isNull();
    }
}
