package com.cephadex.ambi.session.followUp;

import java.util.List;

/**
 * The candidate set of a follow-up round, in the order the board renders it.
 *
 * <p>Stored verbatim as the JSON value of one Redis key (see
 * {@code FollowUpOptionStore}) rather than a field-per-option Hash, because the
 * order is part of the payload: everyone must see the same board. A pick is
 * addressed by {@link FollowUpOption#optionId()}, never by position — the
 * shared order exists so every device renders the one layout, not because
 * anything reads the board by index.
 *
 * @param options the candidates, ordered as {@link FollowUpOptions#mint} laid
 *                them out
 */
public record FollowUpOptionSet(List<FollowUpOption> options) {

    private static final FollowUpOptionSet EMPTY = new FollowUpOptionSet(List.of());

    /** The no-candidate set — a parent kind that mints nothing, or a round never opened. */
    public static FollowUpOptionSet empty() {
        return EMPTY;
    }

    /** The candidate with this id, or {@code null} when the round has no such option. */
    public FollowUpOption byId(String optionId) {
        for (FollowUpOption option : options) {
            if (option.optionId().equals(optionId)) {
                return option;
            }
        }
        return null;
    }
}
