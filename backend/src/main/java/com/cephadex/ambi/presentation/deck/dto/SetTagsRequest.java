package com.cephadex.ambi.presentation.deck.dto;

import java.util.LinkedHashSet;
import java.util.Set;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The complete desired tag set for a deck (EDIT capability). Like the deck's
 * cover/background images and visibility, tags have a single owner in this
 * dedicated endpoint — a metadata edit never touches them. The submitted set
 * fully replaces the current tags, so an empty set clears them.
 */
public record SetTagsRequest(
        @NotNull @Size(max = 50) Set<@NotNull @Size(min = 1, max = 50) String> tags) {

    /** A defensive, order-preserving copy of the submitted tags. */
    public Set<String> tags() {
        return tags == null ? new LinkedHashSet<>() : new LinkedHashSet<>(tags);
    }
}
