package com.cephadex.ambi.session.event;


/** The session was abandoned (host left, never started, error). {@code reason} may be {@code null}. */
public record LiveSessionCancelled(String reason) implements SessionEvent {
}
