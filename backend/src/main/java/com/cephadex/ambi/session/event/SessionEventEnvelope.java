package com.cephadex.ambi.session.event;

import java.time.Instant;

/**
 * The client-facing wrapper around every {@link SessionEvent} broadcast on a
 * session's STOMP topic. Constructed in exactly one place — {@link
 * RedisEventPublisher}, the single choke point on the publish path — so every
 * event, present and future, is enveloped identically and no call site can
 * bypass it.
 *
 * <p>This is what a subscriber receives; the routing {@code publicId} stays on
 * the internal {@link EventEnvelope} and is deliberately <strong>not</strong>
 * part of this payload.
 *
 * <p>The {@code sequence} lets a client detect gaps and duplicates: it is
 * strictly monotonic per session, and {@code SessionSnapshotResponse.lastSequence}
 * gives the value the snapshot it seeds from reflects, so
 * {@code sequence == lastSequence + 1} is the "applies cleanly" condition.
 *
 * @param eventId    unique per emission (a random UUID) — a dedup key that
 *                   survives a duplicate delivery of the same sequence
 * @param sequence   the session's monotonic event counter, allocated atomically
 *                   with the publish (see {@link RedisEventPublisher})
 * @param occurredAt when the envelope was minted, ISO-8601 on the wire
 * @param event      the polymorphic event itself, carrying its {@code "type"}
 *                   discriminator
 */
public record SessionEventEnvelope(String eventId, long sequence, Instant occurredAt, SessionEvent event) {
}
