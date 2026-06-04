package com.cephadex.ambi.session;

public final class SessionTypes {

    // Prevent instantiation of the container class
    private SessionTypes() {
    }

    public record ConnectionCount(int value) {
        public ConnectionCount {
            if (value < 0)
                throw new IllegalArgumentException("Connections cannot be negative");
        }
    }

    public record RoundResultId(String sid, String slideId) {

    }

    public record ParticipantOutcome(
            String participantId,
            String choice,
            boolean correct,
            int points,
            long responseTimeMs) {
    }

}