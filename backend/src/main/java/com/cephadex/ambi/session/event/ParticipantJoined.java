package com.cephadex.ambi.session.event;

import com.cephadex.ambi.session.event.dto.ParticipantView;

/**
 * A participant joined the session — a <strong>delta</strong>: the one new
 * player, never the whole roster. A roster snapshot made each join cost
 * O(roster) to serialize, so filling a session cost O(roster²); a client appends
 * the delta instead, and the documented sequence-gap-and-refetch contract (see
 * {@link RedisEventPublisher}) covers an event it misses. A delta also has no
 * ordering requirement, which is what lets the join path run lock-free.
 */
public record ParticipantJoined(ParticipantView participant) implements SessionEvent {
}
