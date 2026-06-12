package com.cephadex.ambi.presentation.deck.config;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;

import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.DisplayLocation;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;

import lombok.Data;

/**
 * Strongly-typed defaults for a freshly created {@link com.cephadex.ambi.presentation.deck.Deck}
 * and its {@link Settings} (prefix {@code ambi.deck.defaults}). These are the
 * values a new deck/slide starts with — point payouts, countdown, audience caps,
 * the placeholder name and language — gathered into one env-overridable home
 * instead of being scattered as magic numbers across the service and seeder.
 *
 * <p>
 * Follows the {@code AuthProperties} convention: this is config, not a wire DTO,
 * so it's a mutable Lombok class (records can't be partially overridden via
 * {@code application.properties}). The immutable domain still uses the
 * {@link Settings} records — the {@code *Settings()} factory methods convert this
 * mutable config into them at the edge.
 *
 * <p>
 * Auto-registered via {@code @ConfigurationPropertiesScan} on the application
 * class, exactly like the other {@code ambi.*} properties beans.
 */
@Data
@ConfigurationProperties(prefix = "ambi.deck.defaults")
public class DeckDefaultsProperties {

    /** Placeholder name for a deck created with no title yet. */
    private String name = "Untitled Deck";

    /** Default content language (BCP-47 code). */
    private String language = "en";

    private final Points points = new Points();
    private final Answer answer = new Answer();
    private final Audience audience = new Audience();
    private final Invite invite = new Invite();

    /** Mirrors {@link Settings.PointSettings}; 0 means "does not apply". */
    @Data
    public static class Points {
        private int points = 0;
        private int deceptionPoints = 0;
        private int bestAnswerPoints = 0;
        private int fastestCorrectAnswerPoints = 0;
        private boolean resetStreakOnStreakEnd = false;
        // Streak milestones aren't bound here — a new deck starts with none; authors
        // add them per deck. The factory supplies an empty map.
    }

    /** Mirrors {@link Settings.AnswerSettings}. */
    @Data
    public static class Answer {
        private ResultsDisplayMode displayResultsMode = ResultsDisplayMode.ROUND_END;
        private boolean displayResultsAsPercentage = false;
        private boolean shuffleOptions = true;
        private boolean anonymizeAnswers = false;
        /** Countdown seconds; 0 = no countdown. */
        private int countdownTime = 0;
        private boolean allowAnonymous = true;
        /** MCQ max choices; 1 = single-select, 0 = unlimited. */
        private int maxSelections = 1;
    }

    /** Mirrors {@link Settings.AudienceSettings}. */
    @Data
    public static class Audience {
        private int maxParticipants = 100;
        private boolean reactionsEnabled = true;
        private boolean chatEnabled = true;
        private boolean allowLateJoin = true;
        private boolean allowReJoin = true;
        private boolean anonymousMode = false;
        private boolean allowGuests = true;
    }

    /**
     * Mirrors {@link Settings.InviteSettings}. Defaults match what the lobby and
     * session header already surface today: a QR in the lobby, and the room code
     * in both the lobby and the persistent header.
     */
    @Data
    public static class Invite {
        private boolean enableQr = true;
        private Set<DisplayLocation> qrLocations = EnumSet.of(DisplayLocation.LOBBY);
        private boolean showRoomCode = true;
        private Set<DisplayLocation> roomCodeLocations =
                EnumSet.of(DisplayLocation.LOBBY, DisplayLocation.HEADER);
    }

    // ── Factories: materialize the immutable domain records ──────────────────────

    public Settings.PointSettings pointSettings() {
        return new Settings.PointSettings(
                points.points,
                points.deceptionPoints,
                points.bestAnswerPoints,
                points.fastestCorrectAnswerPoints,
                Map.of(),
                points.resetStreakOnStreakEnd);
    }

    public Settings.AnswerSettings answerSettings() {
        return new Settings.AnswerSettings(
                answer.displayResultsMode,
                answer.displayResultsAsPercentage,
                answer.shuffleOptions,
                answer.anonymizeAnswers,
                answer.countdownTime,
                answer.allowAnonymous,
                answer.maxSelections);
    }

    public Settings.AudienceSettings audienceSettings() {
        return new Settings.AudienceSettings(
                audience.maxParticipants,
                audience.reactionsEnabled,
                audience.chatEnabled,
                audience.allowLateJoin,
                audience.allowReJoin,
                audience.anonymousMode,
                audience.allowGuests);
    }

    public Settings.InviteSettings inviteSettings() {
        // Copy the bound sets so the immutable record never aliases the mutable
        // config bean's collections.
        return new Settings.InviteSettings(
                invite.enableQr,
                Set.copyOf(invite.qrLocations),
                invite.showRoomCode,
                Set.copyOf(invite.roomCodeLocations));
    }

    /** The full deck-level settings a new deck starts with. */
    public Settings.DeckSettings deckSettings() {
        return new Settings.DeckSettings(
                pointSettings(), answerSettings(), audienceSettings(), inviteSettings());
    }
}
