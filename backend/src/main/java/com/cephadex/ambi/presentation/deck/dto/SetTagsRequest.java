package com.cephadex.ambi.presentation.deck.dto;

import java.util.LinkedHashSet;
import java.util.Set;

import com.cephadex.ambi.common.validation.ValidationConstants;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The complete desired tag set for a deck (EDIT capability). Like the deck's
 * cover/background images and visibility, tags have a single owner in this
 * dedicated endpoint — a metadata edit never touches them. The submitted set
 * fully replaces the current tags, so an empty set clears them.
 */
public record SetTagsRequest(
        // The Jakarta @Size annotations do the runtime validation (count + per-tag
        // length). @ArraySchema mirrors them into the OpenAPI doc — SpringDoc drops
        // the element @Size on Set<String> from items{}, so we state it explicitly
        // (same constants) so the per-tag bound reaches the generated frontend
        // validationConstants.ts. See backend-rules.
        @NotNull
        @Size(max = ValidationConstants.TAG_MAX_COUNT)
        @ArraySchema(
                maxItems = ValidationConstants.TAG_MAX_COUNT,
                schema = @Schema(
                        minLength = ValidationConstants.TAG_MIN_LENGTH,
                        maxLength = ValidationConstants.TAG_MAX_LENGTH))
        Set<@NotNull @Size(min = ValidationConstants.TAG_MIN_LENGTH,
                max = ValidationConstants.TAG_MAX_LENGTH) String> tags) {

    /** A defensive, order-preserving copy of the submitted tags. */
    public Set<String> tags() {
        return tags == null ? new LinkedHashSet<String>() : new LinkedHashSet<>(tags);
    }
}
