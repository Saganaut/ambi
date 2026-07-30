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
    PREDICT_POPULAR(EnumSet.of(SlideType.MCQ));

    private final Set<SlideType> validParentTypes;

    FollowUpMode(Set<SlideType> validParentTypes) {
        this.validParentTypes = validParentTypes;
    }

    public boolean supportsParent(SlideType parentType) {
        return validParentTypes.contains(parentType);
    }

    /** All modes valid for a given parent content type, in declaration order. */
    public static List<FollowUpMode> modesFor(SlideType parentType) {
        return java.util.Arrays.stream(values())
                .filter(mode -> mode.supportsParent(parentType))
                .toList();
    }
}
