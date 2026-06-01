package com.cephadex.ambi.session;

import java.security.SecureRandom;

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
