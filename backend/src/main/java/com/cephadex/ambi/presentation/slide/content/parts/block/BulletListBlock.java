package com.cephadex.ambi.presentation.slide.content.parts.block;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * A bulleted list.
 *
 * @param id    client-minted stable id
 * @param items list entries, in order
 */
public record BulletListBlock(
        @Schema(requiredMode = REQUIRED) String id,
        List<String> items) implements SlideBlock {
}
