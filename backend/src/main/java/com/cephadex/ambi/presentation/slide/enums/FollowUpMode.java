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
     * Vote for the best submission from the parent round — free-form answers
     * on TEXT/DRAWING parents, the options participants picked on MCQ parents.
     */
    BEST_ANSWER_VOTE(EnumSet.of(SlideType.MCQ, SlideType.TEXT, SlideType.DRAWING)),

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
