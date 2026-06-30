package com.cephadex.ambi.session.answer;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.session.answer.payload.AnswerPayload;

import lombok.Getter;
import lombok.Setter;
/**
 * Represents a participant's submission for a specific slide within a session.
 * <p>
 * This entity maps directly to the {@code answers} collection in MongoDB.
 * </p>
 * * <h3>Field Summary:</h3>
 * <ul>
 * <li><b>id:</b> Unique identifier for this answer document (MongoDB Object ID).</li>
 * <li><b>participantId:</b> The ID of the participant who submitted the answer.</li>
 * <li><b>sessionId:</b> The ID of the active session this answer belongs to.</li>
 * <li><b>slideId:</b> The slide's ID (client-minted UUID) that ties this answer to its specific round.</li>
 * <li><b>submittedAt:</b> Timestamp indicating exactly when the answer was submitted.</li>
 * <li><b>payload:</b> The specific content or data of the answer (e.g., text, choices, etc.).</li>
 * </ul>
 */
@Getter
@Setter
@Document(collection = "answers")
public class Answer {

    @Id
    private String id;

    @Field("participant_id")
    private String participantId;

    @Field("session_id")
    private String sessionId;

    // The slide's id (client-minted UUID); ties an answer to its round.
    @Field("slide_id")
    private String slideId;

    @Field("submitted_at")
    private Instant submittedAt;

    @Field("payload")
    private AnswerPayload payload;
}
