package com.cephadex.ambi.session.redis;

/**
 * One votable submission of a voting round (D3), stored server-side in
 * {@link VoteStore} under the opaque option id minted at voting open. The
 * author's identity lives only here — the wire view
 * ({@code VoteOptionView}) carries the option id and preview but never the
 * author, so a deception round's client can't map an option back to the player
 * who wrote it.
 *
 * @param authorParticipantId who submitted the answer this option stands for
 * @param text                the answer's preview text (free text / follow-up /
 *                            number renderings), or {@code null} for a drawing
 * @param imageUrl            presigned URL of a drawing submission, or
 *                            {@code null} for a text option. Resolved once at
 *                            voting open — a voting window is minutes long, far
 *                            inside the presign validity
 */
public record VoteOption(String authorParticipantId, String text, String imageUrl) {
}
