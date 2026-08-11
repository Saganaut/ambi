package com.cephadex.ambi.session.answer.payload;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;

/**
 * Key formatting, bucket quantization, ordering, and empty-answer behavior for
 * every tallyable answer payload.
 */
class AnswerTallyKeysTest {

    @ParameterizedTest
    @MethodSource("unorderedKeyExamples")
    void payloadContributesTheExpectedUnorderedKeys(AnswerPayload payload, List<String> expectedKeys) {
        assertThat(AnswerTallyKeys.optionKeys(payload)).containsExactlyInAnyOrderElementsOf(expectedKeys);
    }

    static Stream<Arguments> unorderedKeyExamples() {
        return Stream.of(
                Arguments.of(new McqAnswer(Set.of("opt-a", "opt-b")), List.of("opt-a", "opt-b")),
                Arguments.of(new GridAnswer(Map.of("it-1", "0,1", "it-2", "1,0")),
                        List.of("it-1@0,1", "it-2@1,0")),
                Arguments.of(new AxisAnswer(Map.of(
                        "it-1", new AxisPoint(0.0, 0.05),
                        "it-2", new AxisPoint(0.42, 0.78))),
                        List.of("it-1@0,1", "it-2@8,15")),
                Arguments.of(new AxisAnswer(Map.of("it-1", new AxisPoint(1.0, 1.0))),
                        List.of("it-1@19,19")),
                Arguments.of(new ScalesAnswer(Map.of("st-1", 0.05, "st-2", 0.42)),
                        List.of("st-1@0", "st-2@4")),
                Arguments.of(new ScalesAnswer(Map.of("st-1", 1.0)), List.of("st-1@9")),
                Arguments.of(new MatchingAnswer(Map.of("left-1", "right-b", "left-2", "right-a")),
                        List.of("left-1@right-b", "left-2@right-a")),
                Arguments.of(new PlaceOnImageAnswer(Map.of(
                        "it-1", new PlacePoint(0.42, 0.78),
                        "it-2", new PlacePoint(0.0, 0.0))),
                        List.of("it-1@8,15", "it-2@0,0")),
                Arguments.of(new PlaceOnImageAnswer(Map.of("it-1", new PlacePoint(1.0, 1.0))),
                        List.of("it-1@19,19")),
                Arguments.of(new AllocationAnswer(Map.of("opt-a", 6, "opt-b", 0)),
                        List.of("opt-a@6", "opt-b@0")));
    }

    @ParameterizedTest
    @MethodSource("orderedKeyExamples")
    void payloadContributesTheExpectedOrderedKeys(AnswerPayload payload, List<String> expectedKeys) {
        assertThat(AnswerTallyKeys.optionKeys(payload)).containsExactlyElementsOf(expectedKeys);
    }

    static Stream<Arguments> orderedKeyExamples() {
        return Stream.of(
                Arguments.of(new RankingAnswer(List.of("it-c", "it-a", "it-b")),
                        List.of("it-c@0", "it-a@1", "it-b@2")),
                Arguments.of(new FollowUpAnswer("opt-a"), List.of("opt-a")));
    }

    @ParameterizedTest
    @MethodSource("emptyKeyExamples")
    void payloadWithoutTallyableContentContributesNoKeys(AnswerPayload payload) {
        assertThat(AnswerTallyKeys.optionKeys(payload)).isEmpty();
    }

    static Stream<AnswerPayload> emptyKeyExamples() {
        return Stream.of(
                new AllocationAnswer(null),
                new FollowUpAnswer(null),
                new TextAnswer("hello"));
    }
}
