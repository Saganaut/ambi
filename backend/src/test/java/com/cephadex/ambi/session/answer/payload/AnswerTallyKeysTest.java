package com.cephadex.ambi.session.answer.payload;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

class AnswerTallyKeysTest {

    @Test
    void mcqContributesOneKeyPerSelectedOption() {
        assertThat(AnswerTallyKeys.optionKeys(new McqAnswer(Set.of("opt-a", "opt-b"))))
                .containsExactlyInAnyOrder("opt-a", "opt-b");
    }

    @Test
    void gridContributesOneItemAtCellKeyPerPlacement() {
        assertThat(AnswerTallyKeys.optionKeys(new GridAnswer(Map.of("it-1", "0,1", "it-2", "1,0"))))
                .containsExactlyInAnyOrder("it-1@0,1", "it-2@1,0");
    }

    @Test
    void nonTallyablePayloadContributesNoKeys() {
        assertThat(AnswerTallyKeys.optionKeys(new TextAnswer("hello"))).isEmpty();
    }
}
