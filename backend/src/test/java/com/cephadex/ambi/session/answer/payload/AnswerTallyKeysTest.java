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
    void scalesContributesOneQuantizedBucketKeyPerStatement() {
        assertThat(AnswerTallyKeys.optionKeys(new ScalesAnswer(Map.of(
                "st-1", 0.05,
                "st-2", 0.42))))
                .containsExactlyInAnyOrder("st-1@0", "st-2@4");
    }

    @Test
    void scalesPositionOfExactlyOneClampsIntoTheLastBucket() {
        assertThat(AnswerTallyKeys.optionKeys(new ScalesAnswer(Map.of(
                "st-1", 1.0))))
                .containsExactly("st-1@9");
    }

    @Test
    void matchingContributesOneLeftAtRightKeyPerConnection() {
        assertThat(AnswerTallyKeys.optionKeys(new MatchingAnswer(Map.of(
                "left-1", "right-b",
                "left-2", "right-a"))))
                .containsExactlyInAnyOrder("left-1@right-b", "left-2@right-a");
    }

    @Test
    void nonTallyablePayloadContributesNoKeys() {
        assertThat(AnswerTallyKeys.optionKeys(new TextAnswer("hello"))).isEmpty();
    }
}
