package com.cephadex.ambi.session.participant.enums;

/**
 * Why a participant was removed by the host — distinct from a voluntary leave
 * (which is its own event). {@code BANNED} additionally bars rejoining; the client
 * renders the two differently.
 */
public enum RemovalReason {
    KICKED, BANNED
}
