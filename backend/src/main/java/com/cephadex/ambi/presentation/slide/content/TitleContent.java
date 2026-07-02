package com.cephadex.ambi.presentation.slide.content;

import java.util.List;

import com.cephadex.ambi.presentation.slide.content.parts.block.SlideBlock;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * A non-scorable "content" slide — PowerPoint-style display content with no
 * answer and no scoring. The body is an ordered list of typed
 * {@link SlideBlock}s (heading / body text / bullet list / image / callout) the
 * author adds and reorders. The slide's {@code title}, background, and cover
 * image live on {@link com.cephadex.ambi.presentation.slide.Slide}; this record
 * carries only the block body.
 *
 * @param blocks the ordered body blocks; empty for a blank slide
 */
public record TitleContent(
        @Schema(requiredMode = REQUIRED) List<SlideBlock> blocks) implements NonScorableContent {

    // Normalize a missing/legacy body to an empty list so `blocks` is never null
    // on read — TITLE slides created before this field existed (the old empty
    // `TitleContent()`) deserialize with no `blocks`, and the field is contractually
    // required (non-optional in the generated client).
    public TitleContent {
        blocks = blocks == null ? List.of() : blocks;
    }

    @Override
    public SlideType contentType() {
        return SlideType.TITLE;
    }
}
