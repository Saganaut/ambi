package com.cephadex.ambi.session.event;

import java.util.List;

import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.dto.ScoreboardEntry;

/** The session finished normally. Carries the final standings. */
public record SessionEnded(List<ScoreboardEntry> finalScoreboard) implements SessionEvent {
}
