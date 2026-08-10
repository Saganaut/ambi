package com.cephadex.ambi.media.variants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.SqsProperties;

import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SqsException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * The queue-side half of the cross-language message contract. The body asserted
 * here is the exact document {@code worker/tests/test_messages.py} parses, so
 * every field name, nesting level and value form below is pinned deliberately —
 * a rename on either side has to break one of these two files.
 *
 * <p>Also covers the two configuration-level facts: the request goes to the
 * configured queue URL, and a send failure propagates rather than being
 * swallowed here (the swallow belongs to {@link ImageVariantRequests}, the only
 * place that knows a lost job is survivable).
 */
class SqsImageVariantJobPublisherTest {

    private static final String QUEUE_URL = "http://localhost:9324/000000000000/ambi-image-variants";
    private static final Instant REQUESTED_AT = Instant.parse("2026-08-10T12:00:00Z");

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private SqsClient sqs;
    private SqsImageVariantJobPublisher publisher;

    @BeforeEach
    void setUp() {
        sqs = mock(SqsClient.class);
        SqsProperties props = new SqsProperties();
        props.setImageVariantQueueUrl(QUEUE_URL);
        publisher = new SqsImageVariantJobPublisher(sqs, props);
    }

    @Test
    void publishSendsToTheConfiguredQueue() {
        publisher.publish(job());

        assertThat(captureRequest().queueUrl()).isEqualTo(QUEUE_URL);
    }

    @Test
    void publishedBodyCarriesExactlyTheDocumentedFields() {
        publisher.publish(job());

        assertThat(captureBody()).containsOnlyKeys("version", "keyRoot", "srcKey", "bucket",
                "contentType", "tiers", "requestedAt");
    }

    @Test
    void publishedBodyCarriesTheJobItself() {
        publisher.publish(job());

        assertThat(captureBody())
                .containsEntry("version", 1)
                .containsEntry("keyRoot", "gallery/9f2c")
                .containsEntry("srcKey", "gallery/9f2c/original")
                .containsEntry("bucket", "ambi-images")
                .containsEntry("contentType", "image/jpeg");
    }

    @Test
    void publishedTiersAreObjectsOfTierAndMaxEdge() {
        publisher.publish(job());

        List<Map<String, Object>> tiers = captureTiers();
        assertThat(tiers).hasSize(5);
        assertThat(tiers).allSatisfy(tier -> assertThat(tier).containsOnlyKeys("tier", "maxEdge"));
        assertThat(tiers).extracting("tier").containsExactly("XS", "SM", "MD", "LG", "XL");
        assertThat(tiers).extracting("maxEdge").containsExactly(64, 200, 480, 960, 1600);
    }

    @Test
    void publishedRequestedAtIsIso8601Text() {
        publisher.publish(job());

        assertThat(captureBody()).containsEntry("requestedAt", "2026-08-10T12:00:00Z");
    }

    @Test
    void sendFailurePropagatesToTheCaller() {
        when(sqs.sendMessage(any(SendMessageRequest.class)))
                .thenThrow(SqsException.builder().message("the queue is gone").build());

        assertThatThrownBy(() -> publisher.publish(job())).isInstanceOf(SqsException.class);
    }

    // ── helpers ──

    private static ImageVariantJobMessage job() {
        return new ImageVariantJobMessage(ImageVariantJobMessage.VERSION, "gallery/9f2c",
                "gallery/9f2c/original", "ambi-images", "image/jpeg",
                List.of(new ImageVariantJobMessage.TierRequest(ImageSizeOptions.XS, 64),
                        new ImageVariantJobMessage.TierRequest(ImageSizeOptions.SM, 200),
                        new ImageVariantJobMessage.TierRequest(ImageSizeOptions.MD, 480),
                        new ImageVariantJobMessage.TierRequest(ImageSizeOptions.LG, 960),
                        new ImageVariantJobMessage.TierRequest(ImageSizeOptions.XL, 1600)),
                REQUESTED_AT);
    }

    private SendMessageRequest captureRequest() {
        ArgumentCaptor<SendMessageRequest> request = ArgumentCaptor.forClass(SendMessageRequest.class);
        verify(sqs).sendMessage(request.capture());
        return request.getValue();
    }

    private Map<String, Object> captureBody() {
        return MAPPER.readValue(captureRequest().messageBody(), new TypeReference<Map<String, Object>>() {
        });
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> captureTiers() {
        return (List<Map<String, Object>>) captureBody().get("tiers");
    }
}
