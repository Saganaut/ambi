package com.cephadex.ambi.auth.dto;

/**
 * {@code GET /api/auth/username-available} payload — live feedback for the
 * registration screen as the user types a desired handle.
 *
 * <p>{@code available} is <strong>advisory</strong>: the unique index on
 * {@code username} remains the authority (auth/README.md Inv 9), so a
 * {@code true} here can still lose a race at {@code POST /api/auth/register},
 * which surfaces {@code USERNAME_TAKEN}. The response echoes the queried
 * {@code username} so a debounced client can ignore answers to stale keystrokes.
 *
 * @param username  the handle that was checked (echoed verbatim)
 * @param available {@code true} when no account currently holds that username
 */
public record UsernameAvailabilityResponse(String username, boolean available) {
}
