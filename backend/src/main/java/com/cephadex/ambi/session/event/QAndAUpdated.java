package com.cephadex.ambi.session.event;

import java.util.List;

import com.cephadex.ambi.session.event.dto.QAndAQuestionView;

/**
 * The open Q&amp;A round's question list changed — a participant asked a question
 * or the host typed (or cleared) an answer next to one. Carries the
 * <strong>full</strong> current list (like {@code TallyUpdated} carries the full
 * tally), so applying it is idempotent and a dropped event self-heals on the
 * next one.
 */
public record QAndAUpdated(String slideId, List<QAndAQuestionView> questions) implements SessionEvent {
}
