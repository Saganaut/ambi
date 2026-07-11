package com.cephadex.ambi.session.event.dto;

/**
 * One participant's submitted drawing, carried on
 * {@link com.cephadex.ambi.session.event.ResultsRevealed} for a Drawing round
 * so every client can render the gallery of results.
 *
 * <p>The image travels as a pre-resolved (presigned) {@code imageUrl} string
 * rather than an {@code AppImage}, for the reasons documented on
 * {@link DrawingConfigView}: the STOMP fan-out doesn't run the HTTP-side
 * presigning serializer.
 */
public record DrawingSubmissionView(
        String participantId,
        String displayName,
        String imageUrl) {
}
