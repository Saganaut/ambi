package com.cephadex.ambi.session.event;

import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.liveSession.enums.LiveSessionLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/** Play has started: the session left the lobby and is now {@code IN_PROGRESS}. */
public record LiveSessionStarted(LiveSessionLifecycle status, RoundPhase phase) implements SessionEvent {
}
