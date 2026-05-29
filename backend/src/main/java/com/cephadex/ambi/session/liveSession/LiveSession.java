package com.cephadex.ambi.session.liveSession;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.session.liveSession.enums.DeckRunLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

import lombok.Getter;

@Getter

@Document(collection = "LiveSessions")
public class LiveSession {

    @Id
    private String id;

    private String publicId;

    @Field("room_code")
    private String roomCode;

    @Field("invite_token")
    private String inviteToken;

    @Field("status")
    private DeckRunLifecycle status = DeckRunLifecycle.LOBBY;

    @Field("phase")
    private RoundPhase phase = RoundPhase.SUBMIT;

    // All participants in a run, even the host get a participant instance
    @Field("host_participant_id")
    private String hostParticipantId;

    // Snapshot of the deck at the time of run creation
    @Field("deck")
    private Deck deck;

}
