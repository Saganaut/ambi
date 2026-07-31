package com.cephadex.ambi.presentation.slide.enums;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * What a follow-up slide asks about its parent round's submissions. Each mode
 * is only meaningful for certain parent content types, so the valid parent
 * types live here as the single authoritative mapping — {@code DeckService}
 * validates against it, and the frontend mirrors it in
 * {@code utils/followUp.ts} (compile-checked against the generated unions).
 *
 * <p>A mode may also require the parent to carry an authored answer key
 * ({@link #requiresAnswerKey()}) — a fact about the parent's <em>content</em>,
 * not its type, so {@link #modesFor} deliberately ignores it: that list answers
 * "which modes could this kind of slide ever take?", and {@code DeckService}
 * applies the content-level half when a pairing is actually written.
 */
public enum FollowUpMode {

    /**
     * Vote for the best submission from the parent round. Valid on every
     * scorable parent except {@code FOLLOW_UP} itself (no chains): the candidates
     * are the options participants picked on an MCQ parent, their free-form
     * answers on TEXT/DRAWING, and a compact text summary of each submission on
     * the structured kinds (see {@code FollowUpOptions.mint}).
     */
    BEST_ANSWER_VOTE(EnumSet.of(SlideType.MCQ, SlideType.TEXT, SlideType.DRAWING,
            SlideType.NUMBER, SlideType.RANKING, SlideType.SCALES, SlideType.GRID,
            SlideType.AXIS, SlideType.PLACE_ON_IMAGE, SlideType.MATCHING,
            SlideType.ALLOCATION)),

    /** Predict which of the parent's options was picked most. */
    PREDICT_POPULAR(EnumSet.of(SlideType.MCQ)),

    /**
     * Spot the parent's <em>authored</em> answer, hidden among the submitted
     * ones (dixit-style). At mint time the answer key's own wording is seeded
     * into the candidate set, indistinguishable from a submission on the board;
     * a participant who picks it scores, and a participant whose own submission
     * drew picks scores too (see {@code FollowUpOptions.mint} and
     * {@code RoundScorer}).
     *
     * <p>Valid only on a {@code TEXT} parent, and only one that actually
     * carries an answer key — see {@link #requiresAnswerKey()}: with nothing
     * authored there is no answer to hide and nothing to score.
     */
    SPOT_THE_ANSWER(EnumSet.of(SlideType.TEXT), true);

    private final Set<SlideType> validParentTypes;

    private final boolean requiresAnswerKey;

    FollowUpMode(Set<SlideType> validParentTypes) {
        this(validParentTypes, false);
    }

    FollowUpMode(Set<SlideType> validParentTypes, boolean requiresAnswerKey) {
        this.validParentTypes = validParentTypes;
        this.requiresAnswerKey = requiresAnswerKey;
    }

    public boolean supportsParent(SlideType parentType) {
        return validParentTypes.contains(parentType);
    }

    /**
     * Whether the mode additionally needs its parent to carry an authored answer
     * key, beyond {@link #supportsParent} accepting the parent's content type.
     * A mode that mixes the authored answer into the board has nothing to mix in
     * otherwise, so {@code DeckService} rejects the pairing at authoring time —
     * this flag is the authoritative statement of that requirement, so the rule
     * is never spelled out as a mode literal at the call site.
     */
    public boolean requiresAnswerKey() {
        return requiresAnswerKey;
    }

    /** All modes valid for a given parent content type, in declaration order. */
    public static List<FollowUpMode> modesFor(SlideType parentType) {
        return java.util.Arrays.stream(values())
                .filter(mode -> mode.supportsParent(parentType))
                .toList();
    }
}
