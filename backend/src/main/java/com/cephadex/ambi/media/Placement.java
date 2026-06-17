package com.cephadex.ambi.media;

import org.springframework.data.mongodb.core.mapping.Field;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Where an {@link AppImage} sits on a slide, expressed as a span over a fixed
 * grid (6 columns × 4 rows). Mirrors the frontend {@code SlotMapping} shape: a
 * horizontal span {@code [start, end]} over the columns and a vertical span
 * {@code [top, bottom]} over the rows. For example {@code start:1 end:3 top:1
 * bottom:4} fills the left third, full height.
 *
 * <p>This is a pure value object: it carries no {@code @Id} and is never
 * persisted on its own. It is embedded in an {@link AppImage} and is optional —
 * a {@code null} placement means the consumer decides how to position the image.
 *
 * @param start the first column the image spans (1-based, inclusive)
 * @param end   the last column the image spans (1-based, inclusive)
 * @param top   the first row the image spans (1-based, inclusive)
 * @param bottom the last row the image spans (1-based, inclusive)
 */
public record Placement(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @Field("start") int start,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @Field("end") int end,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @Field("top") int top,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @Field("bottom") int bottom) {
}
