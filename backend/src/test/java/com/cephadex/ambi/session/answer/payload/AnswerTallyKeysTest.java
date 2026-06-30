package com.cephadex.ambi.session.answer.payload;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.Test;

class AnswerTallyKeysTest {

    @Test
    void mcqContributesOneKeyPerSelectedOption() {
        assertThat(AnswerTallyKeys.optionKeys(new McqAnswer(Set.of("opt-a", "opt-b"))))
                .containsExactlyInAnyOrder("opt-a", "opt-b");
    }

    @Test
    void nonTallyablePayloadContributesNoKeys() {
        assertThat(AnswerTallyKeys.optionKeys(new TextAnswer("hello"))).isEmpty();
    }
}
