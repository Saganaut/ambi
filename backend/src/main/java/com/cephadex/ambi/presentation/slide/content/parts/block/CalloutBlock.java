package com.cephadex.ambi.presentation.slide.content.parts.block;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * A highlighted callout box.
 *
 * @param id       client-minted stable id
 * @param tone     visual emphasis; {@code null} defaults to {@code INFO}
 * @param richBody rich-text (HTML) body of the callout
 */
public record CalloutBlock(
        @Schema(requiredMode = REQUIRED) String id,
        CalloutTone tone,
        String richBody) implements SlideBlock {
}
