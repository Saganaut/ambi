package com.cephadex.ambi.session.participant;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.user.Avatar;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Document(collection = "participants")
public class Participant {

    // userId should be stripped in the DTO
    @Id
    private String participantId;

    @Field("user_id")
    private String userId;

    @Field("display_name")
    private String displayName;

    @Field("connection_status")
    private ConnectionStatus connectionStatus;

    @Field("avatar")
    private Avatar avatar;

    @Field("color_tag")
    private String colorTag;

    @Field("joined_at")
    private Instant joinedAt = Instant.now();

    @Field("last_seen_at")
    private Instant lastSeenAt;

    @Field("score")
    private ParticipantScore score;

    @Field("banned")
    private boolean banned = false;

}
