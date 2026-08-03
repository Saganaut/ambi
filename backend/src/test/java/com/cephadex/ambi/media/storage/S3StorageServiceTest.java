package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;

/**
 * Batch behaviour of {@link S3StorageService#delete}: empty input is a no-op,
 * and key sets beyond S3's 1000-key DeleteObjects cap are split into compliant
 * requests so callers never have to chunk themselves.
 */
class S3StorageServiceTest {

    private S3Client s3;
    private S3StorageService storage;

    @BeforeEach
    void setUp() {
        s3 = mock(S3Client.class);
        S3Properties props = new S3Properties();
        props.setBucket("ambi-test");
        storage = new S3StorageService(s3, props);
    }

    @Test
    void deleteOfNothingIssuesNoRequest() {
        storage.delete(List.of());

        verify(s3, never()).deleteObjects(any(DeleteObjectsRequest.class));
    }

    @Test
    void deleteWithinTheCapIssuesASingleRequest() {
        storage.delete(List.of("a", "b"));

        ArgumentCaptor<DeleteObjectsRequest> request = ArgumentCaptor.forClass(DeleteObjectsRequest.class);
        verify(s3).deleteObjects(request.capture());
        assertThat(request.getValue().delete().objects())
                .extracting("key")
                .containsExactly("a", "b");
    }

    @Test
    void deleteBeyondTheCapSplitsIntoCompliantBatches() {
        List<String> keys = IntStream.range(0, 1001).mapToObj(i -> "key-" + i).toList();

        storage.delete(keys);

        ArgumentCaptor<DeleteObjectsRequest> request = ArgumentCaptor.forClass(DeleteObjectsRequest.class);
        verify(s3, times(2)).deleteObjects(request.capture());
        List<DeleteObjectsRequest> batches = request.getAllValues();
        assertThat(batches.get(0).delete().objects()).hasSize(1000);
        assertThat(batches.get(1).delete().objects())
                .extracting("key")
                .containsExactly("key-1000");
    }
}
