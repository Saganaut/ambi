package com.cephadex.ambi.session.answer.payload;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;

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
    void axisContributesOneQuantizedBucketKeyPerPlacement() {
        assertThat(AnswerTallyKeys.optionKeys(new AxisAnswer(Map.of(
                "it-1", new AxisPoint(0.0, 0.05),
                "it-2", new AxisPoint(0.42, 0.78)))))
                .containsExactlyInAnyOrder("it-1@0,0", "it-2@4,7");
    }

    @Test
    void axisCoordinateOfExactlyOneClampsIntoTheLastBucket() {
        assertThat(AnswerTallyKeys.optionKeys(new AxisAnswer(Map.of(
                "it-1", new AxisPoint(1.0, 1.0)))))
                .containsExactly("it-1@9,9");
    }

    @Test
    void nonTallyablePayloadContributesNoKeys() {
        assertThat(AnswerTallyKeys.optionKeys(new TextAnswer("hello"))).isEmpty();
    }
}
