package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;

/**
 * The slide-ordering invariants on the {@link Deck} aggregate, exercised with a
 * real {@link SlideRankService}: a move rewrites only the moved slide's key and
 * the embedded array stays physically sorted; a no-gap interior move rebalances
 * first; backfill keys an unkeyed list by array order; and removing a linked
 * slide clears the dangling back-pointer on the other end.
 */
class DeckReorderTest {

    private SlideRankService ranks;

    @BeforeEach
    void setUp() {
        ranks = new SlideRankService();
    }

    @Test
    void backfillAssignsRanksByArrayOrderForNulls() {
        Deck deck = deckWithSlides("s1", "s2", "s3"); // all null sortOrder

        deck.backfillRanks(ranks);

        assertThat(deck.getSlides()).allSatisfy(s -> assertThat(s.getSortOrder()).isNotNull());
        deck.resort();
        assertThat(ids(deck)).containsExactly("s1", "s2", "s3");
    }

    @Test
    void backfillIsNoOpWhenAllKeyed() {
        Deck deck = deckWithSlides("s1", "s2");
        deck.backfillRanks(ranks);
        List<String> before = deck.getSlides().stream().map(Slide::getSortOrder).toList();

        deck.backfillRanks(ranks);

        assertThat(deck.getSlides().stream().map(Slide::getSortOrder).toList())
                .isEqualTo(before);
    }

    @Test
    void moveSlideToStartSortsFirst() {
        Deck deck = keyedDeck("s1", "s2", "s3");

        deck.reorderSlide("s3", 0, ranks);

        assertThat(ids(deck)).containsExactly("s3", "s1", "s2");
    }

    @Test
    void moveSlideToMiddleSortsBetweenNeighbors() {
        Deck deck = keyedDeck("s1", "s2", "s3", "s4");

        deck.reorderSlide("s4", 1, ranks);

        assertThat(ids(deck)).containsExactly("s1", "s4", "s2", "s3");
    }

    @Test
    void moveSlideToEndSortsLast() {
        Deck deck = keyedDeck("s1", "s2", "s3");

        deck.reorderSlide("s1", 3, ranks);

        assertThat(ids(deck)).containsExactly("s2", "s3", "s1");
    }

    @Test
    void moveSlideClampsOutOfRangeIndexToEnd() {
        Deck deck = keyedDeck("s1", "s2", "s3");

        deck.reorderSlide("s1", 99, ranks);

        assertThat(ids(deck)).containsExactly("s2", "s3", "s1");
    }

    @Test
    void moveSlideRewritesOnlyTheMovedKey() {
        Deck deck = keyedDeck("s1", "s2", "s3");
        String s1 = deck.findSlide("s1").orElseThrow().getSortOrder();
        String s2 = deck.findSlide("s2").orElseThrow().getSortOrder();

        deck.reorderSlide("s3", 0, ranks);

        // The slides that didn't move keep their keys.
        assertThat(deck.findSlide("s1").orElseThrow().getSortOrder()).isEqualTo(s1);
        assertThat(deck.findSlide("s2").orElseThrow().getSortOrder()).isEqualTo(s2);
    }

    @Test
    void moveSlideTriggersRebalanceWhenNoGap() {
        // s2 and s3 share a key, so the interior gap they bracket is empty —
        // moving s4 between them must rebalance before it can land.
        Deck deck = new Deck();
        deck.setSlides(new ArrayList<>(List.of(
                slide("s1", ranks.before(ranks.initial())),
                slide("s2", ranks.initial()),
                slide("s3", ranks.initial()),
                slide("s4", ranks.after(ranks.initial())))));

        deck.reorderSlide("s4", 2, ranks);

        // others sorted [s1, s2, s3] (s2 before s3 on id tie-break); s4 lands at
        // index 2, i.e. between s2 and s3.
        assertThat(ids(deck)).containsExactly("s1", "s2", "s4", "s3");
        // Rebalance produced strictly ascending, distinct keys across the board.
        List<String> keys = deck.getSlides().stream().map(Slide::getSortOrder).toList();
        assertThat(keys).isSorted().doesNotHaveDuplicates();
    }

    @Test
    void reorderUnknownSlideIsNoOp() {
        Deck deck = keyedDeck("s1", "s2");

        deck.reorderSlide("missing", 0, ranks);

        assertThat(ids(deck)).containsExactly("s1", "s2");
    }

    @Test
    void removeParentClearsChildsBackPointer() {
        Deck deck = new Deck();
        Slide parent = slide("p", ranks.initial());
        Slide child = slide("c", ranks.after(ranks.initial()));
        parent.setChildId("c");
        child.setParentId("p");
        deck.setSlides(new ArrayList<>(List.of(parent, child)));

        deck.removeSlide("p");

        assertThat(deck.findSlide("c").orElseThrow().getParentId()).isNull();
    }

    @Test
    void removeChildClearsParentsBackPointer() {
        Deck deck = new Deck();
        Slide parent = slide("p", ranks.initial());
        Slide child = slide("c", ranks.after(ranks.initial()));
        parent.setChildId("c");
        child.setParentId("p");
        deck.setSlides(new ArrayList<>(List.of(parent, child)));

        deck.removeSlide("c");

        assertThat(deck.findSlide("p").orElseThrow().getChildId()).isNull();
    }

    @Test
    void removeUnknownSlideReturnsFalse() {
        Deck deck = keyedDeck("s1");
        assertThat(deck.removeSlide("nope")).isFalse();
        assertThat(ids(deck)).containsExactly("s1");
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    /** A deck whose slides have null sortOrder, in the given array order. */
    private static Deck deckWithSlides(String... slideIds) {
        Deck deck = new Deck();
        List<Slide> slides = new ArrayList<>();
        for (String id : slideIds) {
            slides.add(slide(id, null));
        }
        deck.setSlides(slides);
        return deck;
    }

    /** A deck with the given slides keyed in array order via backfill. */
    private Deck keyedDeck(String... slideIds) {
        Deck deck = deckWithSlides(slideIds);
        deck.backfillRanks(ranks);
        deck.resort();
        return deck;
    }

    private static Slide slide(String id, String sortOrder) {
        Slide slide = new Slide();
        slide.setId(id);
        slide.setSortOrder(sortOrder);
        return slide;
    }

    private static List<String> ids(Deck deck) {
        return deck.getSlides().stream().map(Slide::getId).toList();
    }
}
