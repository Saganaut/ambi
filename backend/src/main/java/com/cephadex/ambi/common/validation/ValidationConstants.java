package com.cephadex.ambi.common.validation;

/**
 * Single home for the numeric/pattern bounds used by request-DTO validation
 * ({@code @Size}/{@code @Min}/{@code @Pattern}). Centralizing them here removes
 * the duplication that had crept in (the username rule lived in both
 * {@code RegisterRequest} and {@code AuthController}; the {@code 200}-char name
 * cap lived in five DTOs) and gives the bounds a single authoritative source.
 *
 * <p>
 * These values are also the source of truth for the <em>frontend</em>: SpringDoc
 * projects the annotations that reference them into the OpenAPI schema
 * ({@code maxLength}/{@code minLength}/{@code minimum}/{@code maximum}/
 * {@code pattern}), and {@code frontend/scripts/generate-validation.mjs} turns
 * that schema into a committed {@code validationConstants.ts}. Change a bound
 * here, regenerate, and both tiers move together.
 *
 * <p>
 * Annotation arguments must be compile-time constants, so everything here is a
 * {@code public static final} primitive or {@code String} literal.
 */
public final class ValidationConstants {

    private ValidationConstants() {
    }

    // ── Account / auth ───────────────────────────────────────────────────────
    public static final int USERNAME_MIN = 3;
    public static final int USERNAME_MAX = 30;
    /** Allowed username characters; keeps handles URL- and log-safe. */
    public static final String USERNAME_PATTERN = "[A-Za-z0-9._-]+";

    public static final int DISPLAY_NAME_MIN = 1;
    public static final int DISPLAY_NAME_MAX = 60;

    public static final int TIMEZONE_MAX = 64;
    /** Built-in avatar id length cap. */
    public static final int AVATAR_ID_MAX = 64;

    // ── Content / entities ───────────────────────────────────────────────────
    /** Display-name cap shared by deck, theme, gallery and image names. */
    public static final int NAME_MAX = 200;
    public static final int DECK_DESCRIPTION_MAX = 2000;
    /** Language code length (BCP-47 with variants/extensions). */
    public static final int LANGUAGE_MAX = 16;

    /** Maximum number of tags on a deck. */
    public static final int TAG_MAX_COUNT = 50;
    public static final int TAG_MIN_LENGTH = 1;
    public static final int TAG_MAX_LENGTH = 50;

    /** Lowest valid zero-based slide position in a move request. */
    public static final int SLIDE_INDEX_MIN = 0;

    // ── Comments ─────────────────────────────────────────────────────────────
    /** Body length cap for a deck-discussion comment (top-level or reply). */
    public static final int COMMENT_BODY_MAX = 4000;

    // ── Reviews ──────────────────────────────────────────────────────────────
    /** Lowest valid star score on a deck review. */
    public static final int REVIEW_STARS_MIN = 1;
    /** Highest valid star score on a deck review. */
    public static final int REVIEW_STARS_MAX = 5;
    /** Body length cap for a deck review's optional written text. */
    public static final int REVIEW_BODY_MAX = 2000;
}
