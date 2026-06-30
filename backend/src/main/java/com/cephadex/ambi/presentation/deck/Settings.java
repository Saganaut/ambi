package com.cephadex.ambi.presentation.deck;

import java.util.Map;
import java.util.Set;

import com.cephadex.ambi.presentation.deck.enums.DisplayLocation;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;

public final class Settings {

  public record PointSettings(
      // if 0 then they don't apply
      int points,
      int deceptionPoints,
      int bestAnswerPoints,
      int fastestCorrectAnswerPoints,
      // bonus points keyed by streak length (e.g. 3 -> 100 awards 100 bonus
      // points when a participant reaches a 3-in-a-row streak)
      Map<Integer, Integer> streakBonuses,
      boolean resetStreakOnStreakEnd) {
  }

  public record AudienceSettings(
      int maxParticipants,
      boolean reactionsEnabled,
      boolean chatEnabled,
      boolean allowLateJoin,
      boolean allowReJoin,
      boolean anonymousMode, // if enabled all display names + avatars will be hidden
      boolean allowGuests // can unregistered users join
  ) {

  }

  public record AnswerSettings(
      ResultsDisplayMode displayResultsMode,
      boolean displayResultsAsPercentage,

      boolean shuffleOptions,
      boolean anonymizeAnswers, // This should always be true for deception, otherwise is a useful
                                // setting for QA when asking people to submit questions
      int countdownTime, // 0 means no countdown
      boolean allowAnonymous, // whether unregistered/anonymous players may answer this slide
      int maxSelections // MCQ: max choices a player may pick; 1 = single-select, 0 = unlimited
  ) {
  }

  /**
   * Deck-level configuration for surfacing the join affordances during a
   * presentation. The actual room code / invite token are minted per run on the
   * LiveSession; this only governs whether and WHERE they appear. The QR encodes
   * the join URL; the room code is the human-typeable text code.
   */
  public record InviteSettings(
      boolean enableQr,
      Set<DisplayLocation> qrLocations,
      boolean showRoomCode,
      Set<DisplayLocation> roomCodeLocations) {
  }

  public record DeckSettings(
      // During a session Slide Settisg Points Settinsg take precendence if present
      PointSettings pointSettings,
      AnswerSettings answerSettings,
      AudienceSettings audienceSettings,
      InviteSettings inviteSettings
    ) {
  }

  public record SlideSettings(
      PointSettings pointSettings,
      AnswerSettings answerSettings) {

    public PointSettings resolvePoints(PointSettings deckDefaults) {
      if (this.pointSettings != null) {
        return this.pointSettings;
      }
      return deckDefaults;
    }

    public AnswerSettings resolveAnswer(AnswerSettings deckDefaults) {
      if (this.answerSettings != null) {
        return this.answerSettings;
      }
      return deckDefaults;
    }
  }

  /**
   * The {@link AnswerSettings} in effect for a slide: its per-slide override if
   * present, otherwise the deck defaults (either may be {@code null}). A null-safe
   * wrapper over {@link SlideSettings#resolveAnswer} so callers — round opening and
   * answer submission — don't each repeat the deck-default guard.
   */
  public static AnswerSettings effectiveAnswerSettings(DeckSettings deckSettings, SlideSettings slideSettings) {
    AnswerSettings deckDefaults = deckSettings == null ? null : deckSettings.answerSettings();
    return slideSettings == null ? deckDefaults : slideSettings.resolveAnswer(deckDefaults);
  }

}
