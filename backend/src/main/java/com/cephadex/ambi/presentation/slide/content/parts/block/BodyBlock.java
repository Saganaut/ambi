package com.cephadex.ambi.presentation.slide.content.parts.block;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * A paragraph of rich body text.
 *
 * @param id       client-minted stable id
 * @param richBody rich-text (HTML) body
 */
public record BodyBlock(
        @Schema(requiredMode = REQUIRED) String id,
        String richBody) implements SlideBlock {
}
