package com.cephadex.ambi.session.event.dto;

import com.cephadex.ambi.session.participant.ParticipantScore;

/**
 * The participant-visible view of a {@link ParticipantScore}: the running total
 * plus the full point breakdown (streak, correct count, best-answer and deception
 * subtotals). A player's own score is theirs to see, and richer scoreboards may
 * want the breakdown, so nothing is collapsed away here.
 */
public record ScoreView(
        int points,
        int currentStreak,
        int totalCorrectAnswers,
        int bestAnswerPoints,
        int deceptionPoints) {

    /** Builds the view from a participant's score, treating {@code null} as a zeroed score. */
    public static ScoreView from(ParticipantScore score) {
        if (score == null) {
            return new ScoreView(0, 0, 0, 0, 0);
        }
        return new ScoreView(
                score.getPoints(),
                score.getCurrentStreak(),
                score.getTotalCorrectAnswers(),
                score.getBestAnswerPoints(),
                score.getDeceptionPoints());
    }
}
