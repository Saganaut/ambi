package com.cephadex.ambi.presentation.deck.enums;

/**
 * The capability an explicit {@code acl} grant confers on a single user.
 * Shares never confer management (delete / transfer / re-share / visibility) —
 * see the deck permissions README.
 */
public enum DeckAclRole {
    VIEWER,
    EDITOR
}