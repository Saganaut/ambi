package com.cephadex.ambi.session.participant;

public record ParticipantScore(
        int currentStreak,

        int totalCorrectAnswers,

        // When answer gets voted as the best answer
        int bestAnswerPoints,

        // regular points
        int points,

        // points for deceving others in deception mode
        int deceptionPoints

// total points is derived from these
)

{
    public ParticipantScore() {
        this(0, 0, 0, 0, 0);
    }
}
