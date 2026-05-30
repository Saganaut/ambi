package com.cephadex.ambi.session.answer;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.session.answer.payload.AnswerPayload;

import lombok.Getter;
import lombok.Setter;

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
