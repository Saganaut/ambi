package com.cephadex.ambi.presentation.slide.content.parts.block;

import com.cephadex.ambi.media.AppImage;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * An image, optionally captioned. The image may be gallery-backed or an
 * external URL (see {@link AppImage}).
 *
 * @param id      client-minted stable id
 * @param image   the image to display; {@code null} until the author picks one
 * @param caption optional caption shown beneath the image
 */
public record ImageBlock(
        @Schema(requiredMode = REQUIRED) String id,
        AppImage image,
        String caption) implements SlideBlock {
}
