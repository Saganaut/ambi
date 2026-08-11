package com.cephadex.ambi.presentation.slide.content.parts;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

public class SlideContentTypes {

    private SlideContentTypes() {
    }

    // --------------- enums -----------------------------------------------

    /**
     * Scoring strategy. Not every value applies to every content type:
     * <ul>
     * <li>EXACT, PARTIAL — Ranking, Grid, Matching</li>
     * <li>EXACT, RANGE, CLOSEST — Number</li>
     * <li>INSIDE_RADIUS, NEAREST, DISTANCE — PlaceOnImage</li>
     * </ul>
     */
    public enum McqDataVisualization {
        PIE, BAR_HORIZONTAL, BAR_VERTICAL, LINE, DONUT, PARETO, DOT, POOL_RIBBON, NONE
    }


    public enum ScoreMode {
        EXACT, PARTIAL,
        RANGE, CLOSEST,
        INSIDE_RADIUS, NEAREST, DISTANCE
    }

    /** Answer-matching strategy for text / word-cloud slides. */
    public enum MatchMode {
        EXACT, CONTAINS, WORDCLOUD
    }

    /** Media source kind for {@code MediaContent}. */
    public enum MediaType {
        IMAGE, VIDEO, EMBED
    }

    // --------------- MCQ -------------------------------------------------

    public record McqOption(
            @Schema(requiredMode = REQUIRED) String id,
            @Schema(requiredMode = REQUIRED) McqOptionType optionType,
            String text,
            AppImage image,
            String color) {
    }

    // --------------- Ranking ---------------------------------------------

    /** An item in a ranking question. {@code image} and {@code color} are optional. */
    public record RankItem(String id, String label, AppImage image, String color) {
    }

    // --------------- Scales ----------------------------------------------

    /** An item to position on a scale. {@code image} and {@code color} are optional. */
    public record ScaleItem(String id, String label, AppImage image, String color) {
    }

    // --------------- Grid ------------------------------------------------

    /** An item to drop into a grid cell. {@code image} and {@code color} are optional. */
    public record GridItem(String id, String label, AppImage image, String color) {
    }

    // --------------- Axis -------------------------------------------------

    /** A point on the axis plane, normalized to [0, 1] on both axes. */
    public record AxisPoint(
            @Schema(requiredMode = REQUIRED) double x,
            @Schema(requiredMode = REQUIRED) double y) {
    }

    /** An item players place on the axis plane. {@code image} and {@code color} are optional. */
    public record AxisItem(String id, String label, AppImage image, String color) {
    }

    // --------------- PlaceOnImage ----------------------------------------

    /**
     * An item players pin on the backing image. {@code image} and {@code color}
     * are optional author annotations, mirroring {@link AxisItem}; the answer
     * key lives in {@code PlaceOnImageContent.correctPositions}, keyed by
     * {@code id}, never on the item itself.
     */
    public record PlaceItem(String id, String label, AppImage image, String color) {
    }

    /**
     * A point on the backing image, normalized to [0, 1] on both axes;
     * {@code (0, 0)} is the image's top-left (y is NOT inverted, unlike
     * {@link AxisPoint}). Serves as both the authored answer key
     * ({@code PlaceOnImageContent.correctPositions}) and the runtime placement
     * ({@code PlaceOnImageAnswer.placements}), the same dual role
     * {@link AxisPoint} plays.
     */
    public record PlacePoint(
            @Schema(requiredMode = REQUIRED) double x,
            @Schema(requiredMode = REQUIRED) double y) {
    }

    // --------------- Matching --------------------------------------------

    /** One side of a matching pair. {@code image} and {@code color} are optional. */
    public record MatchItem(String id, String label, AppImage image, String color) {
    }

}
