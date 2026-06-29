package com.cephadex.ambi.session.event;

/**
 * What rides the Redis fan-out channel: the {@code publicId} the relay routes on
 * plus the {@link SessionEvent} to deliver. {@code EventBroadcaster} serializes
 * this; the {@code LiveSessionStompRelay} on each instance deserializes it and
 * forwards {@link #event()} to {@code /topic/session/<publicId>}. The event is
 * polymorphic, so it round-trips with its {@code "type"} discriminator.
 */
public record EventEnvelope(String publicId, SessionEvent event) {
}
