package com.cephadex.ambi.session.event.dto;

/**
 * One row of a scoreboard / final standings: a participant, their total points,
 * and their 1-based rank. Built by the event mapper, which sorts the roster by
 * points before assigning ranks.
 */
public record ScoreboardEntry(String participantId, String displayName, int points, int rank) {
}
