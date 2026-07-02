package com.cephadex.ambi.presentation.slide.content.parts.block;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * A heading line.
 *
 * @param id    client-minted stable id
 * @param text  heading text
 * @param level heading level (1–3); {@code null} defaults to 2 in the editor
 */
public record HeadingBlock(
        @Schema(requiredMode = REQUIRED) String id,
        String text,
        Integer level) implements SlideBlock {
}
