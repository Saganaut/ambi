package com.cephadex.ambi.presentation.slide;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Pins the LexoRank wrapper's contract against the real lexorank4j library
 * (no mocks): every key round-trips through natural {@link String} ordering,
 * {@code after}/{@code before}/{@code between} land on the correct side of their
 * neighbours, and {@code evenlySpaced} produces a strictly ascending run.
 */
class SlideRankServiceTest {

    private SlideRankService ranks;

    @BeforeEach
    void setUp() {
        ranks = new SlideRankService();
    }

    @Test
    void initialReturnsParseableRank() {
        String first = ranks.initial();
        assertThat(first).isNotBlank();
        // A second initial must be reproducible — it's a fixed midpoint.
        assertThat(ranks.initial()).isEqualTo(first);
    }

    @Test
    void afterNullReturnsInitial() {
        assertThat(ranks.after(null)).isEqualTo(ranks.initial());
    }

    @Test
    void beforeNullReturnsInitial() {
        assertThat(ranks.before(null)).isEqualTo(ranks.initial());
    }

    @Test
    void afterMaxSortsAfterIt() {
        String base = ranks.initial();
        assertThat(ranks.after(base)).isGreaterThan(base);
    }

    @Test
    void beforeMinSortsBeforeIt() {
        String base = ranks.initial();
        assertThat(ranks.before(base)).isLessThan(base);
    }

    @Test
    void betweenReturnsRankBetweenBounds() {
        String lower = ranks.initial();
        String upper = ranks.after(lower);

        String mid = ranks.between(lower, upper);

        assertThat(mid).isGreaterThan(lower).isLessThan(upper);
    }

    @Test
    void betweenAdjacentRanksStillFitsBySorting() {
        // Two keys with no integer gap: lexorank4j lengthens the key, so a
        // midpoint still exists and orders correctly.
        String lower = ranks.initial();
        String upper = ranks.between(lower, ranks.after(lower));

        String mid = ranks.between(lower, upper);

        assertThat(mid).isGreaterThan(lower).isLessThan(upper);
    }

    @Test
    void hasGapTrueForOrderedDistinctRanks() {
        String lower = ranks.initial();
        assertThat(ranks.hasGap(lower, ranks.after(lower))).isTrue();
    }

    @Test
    void hasGapFalseWhenRanksEqual() {
        String rank = ranks.initial();
        assertThat(ranks.hasGap(rank, rank)).isFalse();
    }

    @Test
    void hasGapFalseWhenNull() {
        assertThat(ranks.hasGap(null, ranks.initial())).isFalse();
        assertThat(ranks.hasGap(ranks.initial(), null)).isFalse();
    }

    @Test
    void evenlySpacedIsStrictlyAscending() {
        List<String> keys = ranks.evenlySpaced(5);

        assertThat(keys).hasSize(5);
        assertThat(keys).isSorted();
        // Strictly ascending: no duplicates.
        assertThat(keys).doesNotHaveDuplicates();
    }

    @Test
    void evenlySpacedZeroIsEmpty() {
        assertThat(ranks.evenlySpaced(0)).isEmpty();
    }
}
