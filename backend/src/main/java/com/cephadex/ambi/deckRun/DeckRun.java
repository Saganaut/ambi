package com.cephadex.ambi.deckRun;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.cephadex.ambi.deck.Deck;
import com.cephadex.ambi.deckRun.enums.DeckRunLifecycle;
import com.cephadex.ambi.deckRun.enums.RoundPhase;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Document(collection = "deck_runs")
public class DeckRun {

    @Id
    private String id;

    private String roomCode;

    private String inviteToken;

    private DeckRunLifecycle status = DeckRunLifecycle.LOBBY;

    private RoundPhase phase = RoundPhase.SUBMIT;

    // All participants in a run, even the host get a participant instance
    private String hostParticipantId;

    // Snapshot of the deck at the time of run creation
    private Deck deck;

}
