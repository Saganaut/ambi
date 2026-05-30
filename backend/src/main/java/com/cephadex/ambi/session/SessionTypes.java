package com.cephadex.ambi.session;

import java.security.SecureRandom;

public final class SessionTypes {

    // Prevent instantiation of the container class
    private SessionTypes() {
    }

    public record SlideId(String value) {
        public SlideId {
            if (value == null || value.isBlank())
                throw new IllegalArgumentException("Slide ID cannot be empty");
        }
    }

    public record SessionId(String value) {
        public SessionId {
            if (value == null || value.isBlank())
                throw new IllegalArgumentException("Session ID cannot be empty");
        }
    }

    public record RoomCode(String value) {

        /** Number of letters in a room code. */
        public static final int LENGTH = 8;

        // Human-friendly alphabet: uppercase letters with the visually ambiguous
        // I and O dropped, so a code read aloud or off a screen is hard to mistype.
        private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ".toCharArray();
        private static final SecureRandom RNG = new SecureRandom();

        public RoomCode {
            if (value == null || value.length() != LENGTH)
                throw new IllegalArgumentException("Invalid room code");
        }

        /**
         * Mints a fresh, random {@value #LENGTH}-letter room code drawn from a
         * human-friendly uppercase alphabet (no ambiguous {@code I}/{@code O}).
         *
         * <p>
         * This is uniqueness-blind: it can collide with a code already in use.
         * The caller owns reconciliation — re-invoke on a duplicate-key collision,
         * the same way user identifiers are minted (the DB index is the uniqueness
         * authority).
         * </p>
         *
         * @return a new random room code
         */
        public static RoomCode generate() {
            StringBuilder sb = new StringBuilder(LENGTH);
            for (int i = 0; i < LENGTH; i++) {
                sb.append(ALPHABET[RNG.nextInt(ALPHABET.length)]);
            }
            return new RoomCode(sb.toString());
        }
    }

    public record ConnectionCount(int value) {
        public ConnectionCount {
            if (value < 0)
                throw new IllegalArgumentException("Connections cannot be negative");
        }
    }

    public record RoundResultId(SessionId sid, SlideId slideId) {

    }

    public record ParticipantId(String value) {
        public ParticipantId {
            if (value == null || value.isBlank())
                throw new IllegalArgumentException("Participant ID cannot be empty");
        }
    }

    public record ParticipantOutcome(
            ParticipantId participantId,
            String choice,
            boolean correct,
            int points,
            long responseTimeMs) {
    }

}