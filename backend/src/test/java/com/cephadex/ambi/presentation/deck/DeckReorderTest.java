package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;

/**
 * The slide-ordering invariants on the {@link Deck} aggregate, exercised with a
 * real {@link SlideRankService}: a move rewrites only the moved unit's keys and
 * the embedded array stays physically sorted; a no-gap interior move rebalances
 * first; backfill keys an unkeyed list by array order. Follow-up invariants: an
 * added follow-up lands immediately after its parent, a parent/follow-up pair
 * moves as one unit (and other moves can't land inside it), removing a parent
 * cascades to its attached follow-up, and dangling or half-written links —
 * which fail the both-back-pointers-plus-content attachment check — degrade to
 * plain slides everywhere.
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
        List<String> before = deck.getSlides().stream().map(s -> s.getSortOrder()).toList();

        deck.backfillRanks(ranks);

        assertThat(deck.getSlides().stream().map(s -> s.getSortOrder()).toList())
                .isEqualTo(before);
    }

    @Test
    void moveSlideToStartSortsFirst() {
        Deck deck = keyedDeck("s1", "s2", "s3");

        deck.reorderUnit("s3", 0, ranks);

        assertThat(ids(deck)).containsExactly("s3", "s1", "s2");
    }

    @Test
    void moveSlideToMiddleSortsBetweenNeighbors() {
        Deck deck = keyedDeck("s1", "s2", "s3", "s4");

        deck.reorderUnit("s4", 1, ranks);

        assertThat(ids(deck)).containsExactly("s1", "s4", "s2", "s3");
    }

    @Test
    void moveSlideToEndSortsLast() {
        Deck deck = keyedDeck("s1", "s2", "s3");

        deck.reorderUnit("s1", 3, ranks);

        assertThat(ids(deck)).containsExactly("s2", "s3", "s1");
    }

    @Test
    void moveSlideClampsOutOfRangeIndexToEnd() {
        Deck deck = keyedDeck("s1", "s2", "s3");

        deck.reorderUnit("s1", 99, ranks);

        assertThat(ids(deck)).containsExactly("s2", "s3", "s1");
    }

    @Test
    void moveSlideRewritesOnlyTheMovedKey() {
        Deck deck = keyedDeck("s1", "s2", "s3");
        String s1 = deck.findSlide("s1").orElseThrow().getSortOrder();
        String s2 = deck.findSlide("s2").orElseThrow().getSortOrder();

        deck.reorderUnit("s3", 0, ranks);

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

        deck.reorderUnit("s4", 2, ranks);

        // others sorted [s1, s2, s3] (s2 before s3 on id tie-break); s4 lands at
        // index 2, i.e. between s2 and s3.
        assertThat(ids(deck)).containsExactly("s1", "s2", "s4", "s3");
        // Rebalance produced strictly ascending, distinct keys across the board.
        List<String> keys = deck.getSlides().stream().map(s -> s.getSortOrder()).toList();
        assertThat(keys).isSorted().doesNotHaveDuplicates();
    }

    @Test
    void reorderUnknownSlideIsNoOp() {
        Deck deck = keyedDeck("s1", "s2");

        deck.reorderUnit("missing", 0, ranks);

        assertThat(ids(deck)).containsExactly("s1", "s2");
    }

    // ── Follow-up: add ──────────────────────────────────────────────────────────

    @Test
    void addFollowUpPlacesChildImmediatelyAfterMidListParent() {
        Deck deck = keyedDeck("s1", "s2", "s3");
        Slide parent = deck.findSlide("s2").orElseThrow();
        List<String> beforeKeys = keysExcept(deck, "f");

        deck.addFollowUp(followUpSlide("f", null), parent, ranks);

        assertThat(ids(deck)).containsExactly("s1", "s2", "f", "s3");
        assertThat(parent.getChildId()).isEqualTo("f");
        assertThat(deck.findSlide("f").orElseThrow().getParentId()).isEqualTo("s2");
        // Only the new slide's key was minted; nothing else moved.
        assertThat(keysExcept(deck, "f")).isEqualTo(beforeKeys);
    }

    @Test
    void addFollowUpToLastParentAppends() {
        Deck deck = keyedDeck("s1", "s2");
        Slide parent = deck.findSlide("s2").orElseThrow();

        deck.addFollowUp(followUpSlide("f", null), parent, ranks);

        assertThat(ids(deck)).containsExactly("s1", "s2", "f");
    }

    @Test
    void addFollowUpRebalancesWhenNoGapAfterParent() {
        // The parent and its successor share a key — no room for the follow-up
        // until the list is rebalanced.
        Deck deck = new Deck();
        deck.setSlides(new ArrayList<>(List.of(
                slide("s1", ranks.initial()),
                slide("s2", ranks.initial()))));

        deck.addFollowUp(followUpSlide("f", null), deck.findSlide("s1").orElseThrow(), ranks);

        assertThat(ids(deck)).containsExactly("s1", "f", "s2");
        List<String> keys = deck.getSlides().stream().map(s -> s.getSortOrder()).toList();
        assertThat(keys).isSorted().doesNotHaveDuplicates();
    }

    // ── Duplicate: placement ────────────────────────────────────────────────────

    @Test
    void addDuplicatePlacesTheCopyImmediatelyAfterAMidListSource() {
        Deck deck = keyedDeck("s1", "s2", "s3");
        Slide source = deck.findSlide("s2").orElseThrow();
        List<String> beforeKeys = keysExcept(deck, "s2-copy");

        deck.addDuplicate(slide("s2-copy", null), null, source, ranks);

        assertThat(ids(deck)).containsExactly("s1", "s2", "s2-copy", "s3");
        // Only the inserted slide's key was minted; nothing else moved.
        assertThat(keysExcept(deck, "s2-copy")).isEqualTo(beforeKeys);
    }

    @Test
    void addDuplicateOfTheLastSlideAppends() {
        Deck deck = keyedDeck("s1", "s2");

        deck.addDuplicate(slide("s2-copy", null), null, deck.findSlide("s2").orElseThrow(), ranks);

        assertThat(ids(deck)).containsExactly("s1", "s2", "s2-copy");
    }

    @Test
    void addDuplicateOfAPairLandsAfterTheSourcesFollowUpAndLinksTheCopies() {
        Deck deck = deckWithAttachedPair("p", "f", "s3");
        Slide copy = slide("p-copy", null);
        Slide followUpCopy = followUpSlide("f-copy", null);

        deck.addDuplicate(copy, followUpCopy, deck.findSlide("p").orElseThrow(), ranks);

        assertThat(ids(deck)).containsExactly("p", "f", "p-copy", "f-copy", "s3");
        assertThat(copy.getParentId()).isNull();
        assertThat(copy.getChildId()).isEqualTo("f-copy");
        assertThat(followUpCopy.getParentId()).isEqualTo("p-copy");
        assertThat(followUpCopy.getChildId()).isNull();
        // The source pair keeps pointing at itself.
        assertThat(deck.findSlide("p").orElseThrow().getChildId()).isEqualTo("f");
        assertThat(deck.findSlide("f").orElseThrow().getParentId()).isEqualTo("p");
    }

    @Test
    void addDuplicateClearsALinkTheCopyInheritedFromTheSource() {
        // The service hands over a verbatim deep copy, so the copy of a parent
        // arrives still pointing at the SOURCE's follow-up. With no follow-up
        // copy to adopt, that stale link has to be dropped.
        Deck deck = deckWithAttachedPair("p", "f", "s3");
        Slide copy = slide("p-copy", null);
        copy.setChildId("f");
        copy.setParentId("ghost");

        deck.addDuplicate(copy, null, deck.findSlide("p").orElseThrow(), ranks);

        assertThat(copy.getChildId()).isNull();
        assertThat(copy.getParentId()).isNull();
        assertThat(deck.findSlide("f").orElseThrow().getParentId()).isEqualTo("p");
    }

    @Test
    void addDuplicateRebalancesWhenNoGapAfterTheSource() {
        // The source and its successor share a key — no room for the copy until
        // the list is rebalanced.
        Deck deck = new Deck();
        deck.setSlides(new ArrayList<>(List.of(
                slide("s1", ranks.initial()),
                slide("s2", ranks.initial()))));

        deck.addDuplicate(slide("s1-copy", null), null, deck.findSlide("s1").orElseThrow(), ranks);

        assertThat(ids(deck)).containsExactly("s1", "s1-copy", "s2");
        List<String> keys = deck.getSlides().stream().map(s -> s.getSortOrder()).toList();
        assertThat(keys).isSorted().doesNotHaveDuplicates();
    }

    @Test
    void addDuplicateOfAPairRebalancesWhenNoGapAfterTheFollowUp() {
        Deck deck = new Deck();
        Slide parent = slide("p", ranks.before(ranks.initial()));
        Slide followUp = followUpSlide("f", ranks.initial());
        parent.setChildId("f");
        followUp.setParentId("p");
        deck.setSlides(new ArrayList<>(List.of(parent, followUp, slide("s3", ranks.initial()))));

        deck.addDuplicate(slide("p-copy", null), followUpSlide("f-copy", null), parent, ranks);

        assertThat(ids(deck)).containsExactly("p", "f", "p-copy", "f-copy", "s3");
        List<String> keys = deck.getSlides().stream().map(s -> s.getSortOrder()).toList();
        assertThat(keys).isSorted().doesNotHaveDuplicates();
    }

    // ── Follow-up: remove ───────────────────────────────────────────────────────

    @Test
    void removeParentCascadesAttachedFollowUp() {
        Deck deck = deckWithAttachedPair("p", "f", "s2");

        assertThat(deck.removeSlide("p")).isTrue();

        assertThat(ids(deck)).containsExactly("s2");
    }

    @Test
    void removeFollowUpClearsParentsBackPointer() {
        Deck deck = deckWithAttachedPair("p", "f", "s2");

        assertThat(deck.removeSlide("f")).isTrue();

        assertThat(ids(deck)).containsExactly("p", "s2");
        assertThat(deck.findSlide("p").orElseThrow().getChildId()).isNull();
    }

    @Test
    void removeParentWithDanglingLinkClearsBackPointerWithoutCascade() {
        // The "child" lacks FollowUpContent, so the link is legacy garbage: the
        // parent's removal must not take the child with it, only unlink it.
        Deck deck = new Deck();
        Slide parent = slide("p", ranks.initial());
        Slide child = slide("c", ranks.after(ranks.initial()));
        parent.setChildId("c");
        child.setParentId("p");
        deck.setSlides(new ArrayList<>(List.of(parent, child)));

        deck.removeSlide("p");

        assertThat(ids(deck)).containsExactly("c");
        assertThat(deck.findSlide("c").orElseThrow().getParentId()).isNull();
    }

    @Test
    void removeUnknownSlideReturnsFalse() {
        Deck deck = keyedDeck("s1");
        assertThat(deck.removeSlide("nope")).isFalse();
        assertThat(ids(deck)).containsExactly("s1");
    }

    // ── Follow-up: move as a unit ───────────────────────────────────────────────

    @Test
    void reorderUnitMovesPairAsBlock() {
        Deck deck = deckWithAttachedPair("p", "f", "s2", "s3");

        deck.reorderUnit("p", 3, ranks);

        assertThat(ids(deck)).containsExactly("s2", "s3", "p", "f");
    }

    @Test
    void reorderUnitMovesPairToStart() {
        Deck deck = deckWithAttachedPair("p", "f", "s2", "s3");
        deck.reorderUnit("p", 2, ranks); // s2, s3, p, f

        deck.reorderUnit("p", 0, ranks);

        assertThat(ids(deck)).containsExactly("p", "f", "s2", "s3");
    }

    @Test
    void reorderUnitRewritesOnlyTheMovedPairsKeys() {
        Deck deck = deckWithAttachedPair("p", "f", "s2", "s3");
        String s2 = deck.findSlide("s2").orElseThrow().getSortOrder();
        String s3 = deck.findSlide("s3").orElseThrow().getSortOrder();

        deck.reorderUnit("p", 4, ranks);

        assertThat(deck.findSlide("s2").orElseThrow().getSortOrder()).isEqualTo(s2);
        assertThat(deck.findSlide("s3").orElseThrow().getSortOrder()).isEqualTo(s3);
    }

    @Test
    void reorderUnitSnapsTargetInsideAnotherPairPastIt() {
        // Order: p, f, s2 — moving s2 to flat index 1 would split the pair, so
        // it snaps past it (which keeps the order unchanged here).
        Deck deck = deckWithAttachedPair("p", "f", "s2");

        deck.reorderUnit("s2", 1, ranks);

        assertThat(ids(deck)).containsExactly("p", "f", "s2");
    }

    @Test
    void reorderUnitBeforeAnotherPairLandsAheadOfIt() {
        Deck deck = deckWithAttachedPair("p", "f", "s2");

        deck.reorderUnit("s2", 0, ranks);

        assertThat(ids(deck)).containsExactly("s2", "p", "f");
    }

    @Test
    void reorderUnitOnAttachedFollowUpIsNoOp() {
        Deck deck = deckWithAttachedPair("p", "f", "s2");

        deck.reorderUnit("f", 0, ranks);

        assertThat(ids(deck)).containsExactly("p", "f", "s2");
    }

    @Test
    void reorderUnitWithDanglingLinkTreatsSlidesAsSingles() {
        // One-sided link, no FollowUpContent: "c" is not attached, so it can be
        // moved freely and "p" moves alone.
        Deck deck = keyedDeck("p", "c", "s3");
        deck.findSlide("p").orElseThrow().setChildId("c");

        deck.reorderUnit("c", 3, ranks);

        assertThat(ids(deck)).containsExactly("p", "s3", "c");
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

    /**
     * A keyed deck whose first two slides are a valid attached parent/follow-up
     * pair (both back-pointers set, child carrying {@link FollowUpContent}),
     * followed by the given plain slides.
     */
    private Deck deckWithAttachedPair(String parentId, String followUpId, String... restIds) {
        Deck deck = new Deck();
        List<Slide> slides = new ArrayList<>();
        Slide parent = slide(parentId, null);
        Slide followUp = followUpSlide(followUpId, null);
        parent.setChildId(followUpId);
        followUp.setParentId(parentId);
        slides.add(parent);
        slides.add(followUp);
        for (String id : restIds) {
            slides.add(slide(id, null));
        }
        deck.setSlides(slides);
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

    private static Slide followUpSlide(String id, String sortOrder) {
        Slide slide = slide(id, sortOrder);
        slide.setContent(new FollowUpContent(FollowUpMode.PREDICT_POPULAR));
        return slide;
    }

    private static List<String> ids(Deck deck) {
        return deck.getSlides().stream().map(s -> s.getId()).toList();
    }

    /** Sort keys of every slide except {@code excludedId}, in canonical order. */
    private static List<String> keysExcept(Deck deck, String excludedId) {
        return deck.getSlides().stream()
                .sorted(SlideRankService.ordering())
                .filter(s -> !excludedId.equals(s.getId()))
                .map(s -> s.getSortOrder())
                .toList();
    }
}
