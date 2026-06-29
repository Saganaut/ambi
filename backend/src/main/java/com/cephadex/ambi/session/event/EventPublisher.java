package com.cephadex.ambi.session.event;

/**
 * The notify seam between {@code LiveSessionOrchestrator} and clients. The
 * orchestrator mutates Redis/Mongo and then publishes a {@link SessionEvent}; it
 * never references a transport (STOMP, WebSocket) directly.
 *
 * <p>The v1 implementation broadcasts to the local STOMP broker on a per-session
 * topic. Multi-instance fan-out (a Redis pub/sub bridge re-broadcasting on every
 * app instance — see open-decisions A2) slots in behind this same interface, so
 * adding it is a one-class change and never touches the orchestrator.
 */
public interface EventPublisher {

    /** Broadcasts {@code event} to everyone subscribed to {@code sessionId}. */
    void publish(String sessionId, SessionEvent event);
}
