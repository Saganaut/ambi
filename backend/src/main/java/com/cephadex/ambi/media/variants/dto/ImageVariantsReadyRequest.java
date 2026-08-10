package com.cephadex.ambi.media.variants.dto;

import java.util.Set;

import com.cephadex.ambi.media.enums.ImageSizeOptions;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * What the rendition worker reports once it has stored a batch of tiers.
 *
 * <p>Ordering invariant the worker owns: every variant object is PUT
 * <em>before</em> the report that names its tier. A tier listed here is
 * therefore immediately safe to hand out a URL for.
 *
 * @param readyTiers tiers now stored — unioned into the row, so a partial or
 *                   redelivered report is safe and never retracts a tier
 * @param terminal   the worker has given up on whatever is still missing (an
 *                   undecodable original); the row survives and the image
 *                   serves its original indefinitely
 * @param attempt    the worker's delivery attempt, logged for diagnosis only
 */
public record ImageVariantsReadyRequest(
        @NotBlank String keyRoot,
        @NotNull Set<ImageSizeOptions> readyTiers,
        boolean terminal,
        int attempt) {
}
