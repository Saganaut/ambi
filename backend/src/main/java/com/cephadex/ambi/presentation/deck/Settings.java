package com.cephadex.ambi.presentation.deck;

import java.util.Map;

public final class Settings {

        public record StreakMilestone(
                        int countRequired,
                        int bonusPoints) {
        }

        public record PointSettings(
                        // if 0 then they don't apply
                        int points,
                        int deceptionPoints,
                        int bestAnswerPoints,
                        int fastestCorrectAnswerPoints,
                        Map<Integer, StreakMilestone> streakBonuses,
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
                        boolean displayResultsLive,
                        boolean allowMultipleAnswers, // For MCQ they can select several, for text they can input
                                                      // several
                        boolean shuffleOptions,
                        boolean anonymizeAnswers, // This should always be true for deception, otherwise is a useful
                                                  // setting for QA when asking people to submit questions
                        int countdownTime, // 0 means no countdown
                        boolean allowAnonymous, // whether unregistered/anonymous players may answer this slide
                        int maxSelections // MCQ: max choices a player may pick; 1 = single-select, 0 = unlimited
        ) {
        }

        public record DeckSettings(
                        // During a session Slide Settisg Points Settinsg take precendence if present
                        PointSettings pointSettings,
                        AnswerSettings answerSettings,
                        AudienceSettings audienceSettings) {
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
        }

}