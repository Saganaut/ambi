package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import jakarta.validation.constraints.Size;

/**
 * The participant's pick on a follow-up board — the id of one of the round's
 * server-minted candidate options.
 *
 * <p>On a follow-up round the vote <em>is</em> the answer: the pick travels the
 * regular answer path (submit, tally, round result) rather than the VOTE phase
 * and its {@code VoteStore}, which stays reserved for voting on the current
 * round's own free-text submissions.
 *
 * <p>The length cap is a bean-validation {@code @Size} so it lands in the
 * OpenAPI schema (and the generated frontend validation constants); the id is
 * server-minted, so the cap is a shape guard rather than a domain rule.
 */
public record FollowUpAnswer(
        @Size(max = ValidationConstants.FOLLOW_UP_OPTION_ID_MAX) String optionId) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.FOLLOW_UP;
    }
}
