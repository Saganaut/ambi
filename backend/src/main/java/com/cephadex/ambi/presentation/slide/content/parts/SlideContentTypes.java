package com.cephadex.ambi.presentation.slide.content.parts;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;

public class SlideContentTypes {

    private SlideContentTypes() {
    }

    // --------------- enums -----------------------------------------------

    /**
     * Scoring strategy. Not every value applies to every content type:
     * <ul>
     *   <li>EXACT, PARTIAL — Ranking, Grid, Matching</li>
     *   <li>EXACT, RANGE, CLOSEST — Number</li>
     *   <li>INSIDE_RADIUS, NEAREST, DISTANCE — PlaceOnImage</li>
     * </ul>
     */
    public enum ScoreMode {
        EXACT, PARTIAL,
        RANGE, CLOSEST,
        INSIDE_RADIUS, NEAREST, DISTANCE
    }

    /** Answer-matching strategy for text / word-cloud slides. */
    public enum MatchMode { EXACT, CONTAINS, WORDCLOUD }

    /** Media source kind for {@code MediaContent}. */
    public enum MediaType { IMAGE, VIDEO, EMBED }

    // --------------- MCQ -------------------------------------------------

    public record McqOptionId(String value) {
        public McqOptionId {
            if (value == null || value.isBlank())
                throw new IllegalArgumentException("Mcq Option ID cannot be empty");
        }
    }

    public record McqOption(
            McqOptionId id,
            McqOptionType optionType,
            String text,
            AppImage image,
            String color) {
    }

    // --------------- Ranking ---------------------------------------------

    /** An item in a ranking question. {@code image} is optional. */
    public record RankItem(String id, String label, AppImage image) {}

    // --------------- Scales ----------------------------------------------

    /** An item to position on a scale. */
    public record ScaleItem(String id, String label) {}

    // --------------- Grid ------------------------------------------------

    /** An item to drop into a grid cell. {@code image} is optional. */
    public record GridItem(String id, String label, AppImage image) {}

    // --------------- PlaceOnImage ----------------------------------------

    /**
     * A click target on an image.
     * {@code x}, {@code y}, and {@code radius} are normalized to [0, 1].
     */
    public record Target(String id, double x, double y, double radius) {}

    // --------------- Matching --------------------------------------------

    /** One side of a matching pair. {@code image} is optional. */
    public record MatchItem(String id, String label, AppImage image) {}

    // --------------- FollowUp / Submission reference ---------------------

    public record SubmissionId(String value) {
        public SubmissionId {
            if (value == null || value.isBlank())
                throw new IllegalArgumentException("Submission ID cannot be empty");
        }
    }

    public record SubmissionOption(
            SubmissionId submissionId
    // TODO: consider whether we need to add more info here or just use the
    // submission ID and get the content from the previous rounds answers
    ) {
    }

}
