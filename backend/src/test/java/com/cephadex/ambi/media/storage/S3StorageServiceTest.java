package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.paginators.ListObjectsV2Iterable;

/**
 * Batch behaviour of {@link S3StorageService#delete} (empty input is a no-op,
 * key sets beyond S3's 1000-key DeleteObjects cap are split into compliant
 * requests), the same-bucket copy pair — {@link S3StorageService#copyIfExists}
 * treats a missing source as {@code false}, not an error — and the
 * prefix-scoped list/delete built on the paginator.
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

    @Test
    void copyIssuesASameBucketCopy() {
        storage.copy("gallery/abc/original", "deck/d1/xyz/original");

        ArgumentCaptor<CopyObjectRequest> request = ArgumentCaptor.forClass(CopyObjectRequest.class);
        verify(s3).copyObject(request.capture());
        assertThat(request.getValue().sourceBucket()).isEqualTo("ambi-test");
        assertThat(request.getValue().sourceKey()).isEqualTo("gallery/abc/original");
        assertThat(request.getValue().destinationBucket()).isEqualTo("ambi-test");
        assertThat(request.getValue().destinationKey()).isEqualTo("deck/d1/xyz/original");
    }

    @Test
    void copyIfExistsReturnsTrueWhenTheSourceExists() {
        assertThat(storage.copyIfExists("a", "b")).isTrue();
    }

    @Test
    void copyIfExistsReturnsFalseForAMissingSource() {
        when(s3.copyObject(any(CopyObjectRequest.class)))
                .thenThrow(NoSuchKeyException.builder().statusCode(404).build());

        assertThat(storage.copyIfExists("gone", "b")).isFalse();
    }

    @Test
    void copyIfExistsTreatsAPlain404AsMissing() {
        // Garage reports a missing copy source as a bare 404 S3Exception rather
        // than the typed NoSuchKeyException.
        when(s3.copyObject(any(CopyObjectRequest.class)))
                .thenThrow((S3Exception) S3Exception.builder().statusCode(404).build());

        assertThat(storage.copyIfExists("gone", "b")).isFalse();
    }

    @Test
    void copyIfExistsWrapsOtherFailures() {
        when(s3.copyObject(any(CopyObjectRequest.class)))
                .thenThrow((S3Exception) S3Exception.builder().statusCode(500).build());

        assertThatThrownBy(() -> storage.copyIfExists("a", "b"))
                .isInstanceOf(MediaStorageException.class);
    }

    @Test
    void listKeysWalksEveryPage() {
        stubListPages(
                page(true, "t1", "deck/d1/a/original"),
                page(false, null, "deck/d1/a/sm.webp"));

        assertThat(storage.listKeys("deck/d1/"))
                .containsExactly("deck/d1/a/original", "deck/d1/a/sm.webp");
    }

    @Test
    void deletePrefixDeletesEveryListedKey() {
        stubListPages(page(false, null, "deck/d1/a/original", "deck/d1/a/sm.webp"));

        storage.deletePrefix("deck/d1/");

        ArgumentCaptor<DeleteObjectsRequest> request = ArgumentCaptor.forClass(DeleteObjectsRequest.class);
        verify(s3).deleteObjects(request.capture());
        assertThat(request.getValue().delete().objects())
                .extracting("key")
                .containsExactly("deck/d1/a/original", "deck/d1/a/sm.webp");
    }

    @Test
    void deletePrefixOfAnEmptyPrefixIssuesNoDelete() {
        stubListPages(page(false, null));

        storage.deletePrefix("deck/empty/");

        verify(s3, never()).deleteObjects(any(DeleteObjectsRequest.class));
    }

    /** Route the paginator through the mocked client so the stubbed pages drive it. */
    private void stubListPages(ListObjectsV2Response first, ListObjectsV2Response... rest) {
        when(s3.listObjectsV2Paginator(any(ListObjectsV2Request.class)))
                .thenAnswer(inv -> new ListObjectsV2Iterable(s3, inv.getArgument(0)));
        when(s3.listObjectsV2(any(ListObjectsV2Request.class))).thenReturn(first, rest);
    }

    private static ListObjectsV2Response page(boolean truncated, String nextToken, String... keys) {
        return ListObjectsV2Response.builder()
                .contents(Arrays.stream(keys)
                        .map(key -> S3Object.builder().key(key).build())
                        .toList())
                .isTruncated(truncated)
                .nextContinuationToken(nextToken)
                .build();
    }
}
