package com.cephadex.ambi.presentation.deck.enums;

/**
 * A surface in a presented deck where the join affordances (the QR code and/or
 * the human room code) can be shown. Used by {@code Settings.InviteSettings} as a
 * multi-select: a code may appear on several surfaces at once, so "everywhere" is
 * expressed by selecting every value rather than a dedicated {@code ALL}.
 *
 * <p>
 * Each value maps to a real render target in the live session:
 * <ul>
 * <li>{@link #LOBBY} — the waiting room before play starts.</li>
 * <li>{@link #TITLE} — title slides.</li>
 * <li>{@link #HEADER} — the persistent session chrome shown across all slides.</li>
 * <li>{@link #SLIDES} — the body of content / question slides.</li>
 * <li>{@link #RESULTS} — the overall / end results screen.</li>
 * </ul>
 */
public enum DisplayLocation {
    LOBBY,
    TITLE,
    HEADER,
    SLIDES,
    RESULTS
}
