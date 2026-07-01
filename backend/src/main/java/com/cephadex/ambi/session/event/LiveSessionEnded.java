package com.cephadex.ambi.session.event;

import java.util.List;

import com.cephadex.ambi.session.event.dto.ScoreboardEntry;

/** The session finished normally. Carries the final standings. */
public record LiveSessionEnded(List<ScoreboardEntry> finalScoreboard) implements SessionEvent {
}
