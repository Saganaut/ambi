package com.cephadex.ambi.session.participant;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
public class ParticipantScore {
    private int currentStreak = 0;
    private int totalCorrectAnswers = 0;
    private int bestAnswerPoints = 0;
    private int points = 0;
    private int deceptionPoints = 0;

    public int getCurrentStreak() {
        return this.currentStreak;
    }

    public int getPoints() {
        return this.points;
    }

    public void recordCorrectAnswer(int basePoints) {
        this.points += basePoints;
        this.totalCorrectAnswers += 1;
        this.currentStreak += 1;
    }

    public void recordIncorrectAnswer(boolean resetStreak) {
        if (resetStreak) {
            this.currentStreak = 0;
        }
    }

    public void awardStreakBonus(int bonus) {
        this.points += bonus;
    }

    public void awardBestAnswer(int bestPoints) {
        this.bestAnswerPoints += bestPoints;
        this.points += bestPoints; // Add to global total
    }

    public void awardDeception(int deceptionPoints) {
        this.deceptionPoints += deceptionPoints;
        this.points += deceptionPoints; // Add to global total
    }

    public void awardFastestAnswerBonus(int speedBonus) {
        this.points += speedBonus;
    }
}
