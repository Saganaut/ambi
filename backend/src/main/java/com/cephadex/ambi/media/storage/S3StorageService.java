package com.cephadex.ambi.media.storage;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.Delete;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Thin wrapper over the {@link S3Client} that confines every bucket interaction
 * (and the {@code ambi.s3.bucket} name) to one place. Higher layers deal in
 * keys and bytes; the SDK's checked-ish {@link S3Exception}s are translated into
 * our {@link MediaStorageException} (a 5xx {@code ApiException}) so callers never
 * leak SDK types or stack traces.
 */
@Service
public class S3StorageService {

    /** S3's hard cap on keys per DeleteObjects request. */
    private static final int MAX_KEYS_PER_DELETE = 1000;

    private final S3Client s3;
    private final String bucket;

    public S3StorageService(S3Client s3, S3Properties props) {
        this.s3 = s3;
        this.bucket = props.getBucket();
    }

    /** Store {@code bytes} at {@code key} with the given content type (overwrites). */
    public void put(String key, byte[] bytes, String contentType) {
        try {
            s3.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromBytes(bytes));
        } catch (S3Exception e) {
            throw new MediaStorageException("Failed to store object " + key, e);
        }
    }

    /** The stored object's bytes + content type, or {@code null} if absent. */
    public StoredObject get(String key) {
        try (ResponseInputStream<GetObjectResponse> in = s3.getObject(
                GetObjectRequest.builder().bucket(bucket).key(key).build())) {
            return new StoredObject(in.readAllBytes(), in.response().contentType());
        } catch (NoSuchKeyException e) {
            return null;
        } catch (S3Exception | java.io.IOException e) {
            throw new MediaStorageException("Failed to read object " + key, e);
        }
    }

    /** Server-side copy of a stored object to another key (overwrites). */
    public void copy(String sourceKey, String destinationKey) {
        try {
            s3.copyObject(copyRequest(sourceKey, destinationKey));
        } catch (S3Exception e) {
            throw new MediaStorageException(
                    "Failed to copy object " + sourceKey + " to " + destinationKey, e);
        }
    }

    /**
     * As {@link #copy}, but a missing source object is not an error: returns
     * {@code false} and copies nothing, so callers can adopt an image whose
     * bytes are already gone without failing the surrounding operation.
     */
    public boolean copyIfExists(String sourceKey, String destinationKey) {
        try {
            s3.copyObject(copyRequest(sourceKey, destinationKey));
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return false;
            }
            throw new MediaStorageException(
                    "Failed to copy object " + sourceKey + " to " + destinationKey, e);
        }
    }

    private CopyObjectRequest copyRequest(String sourceKey, String destinationKey) {
        return CopyObjectRequest.builder()
                .sourceBucket(bucket)
                .sourceKey(sourceKey)
                .destinationBucket(bucket)
                .destinationKey(destinationKey)
                .build();
    }

    /** Every stored key under {@code prefix} (paginated list, may be empty). */
    public List<String> listKeys(String prefix) {
        try {
            List<String> keys = new ArrayList<>();
            s3.listObjectsV2Paginator(
                    ListObjectsV2Request.builder().bucket(bucket).prefix(prefix).build())
                    .contents()
                    .forEach(object -> keys.add(object.key()));
            return keys;
        } catch (S3Exception e) {
            throw new MediaStorageException("Failed to list objects under " + prefix, e);
        }
    }

    /** Delete every stored object under {@code prefix} (idempotent). */
    public void deletePrefix(String prefix) {
        delete(listKeys(prefix));
    }

    /**
     * Delete the given keys (no-op on an empty collection). Deleting an absent
     * key is not an error in S3, so this is idempotent — safe to call when an
     * image's objects may already be gone. Large sets are issued in batches of
     * {@value #MAX_KEYS_PER_DELETE}, the DeleteObjects request cap.
     */
    public void delete(Collection<String> keys) {
        if (keys == null || keys.isEmpty()) {
            return;
        }
        List<ObjectIdentifier> ids = keys.stream()
                .map(key -> ObjectIdentifier.builder().key(key).build())
                .toList();
        try {
            for (int from = 0; from < ids.size(); from += MAX_KEYS_PER_DELETE) {
                List<ObjectIdentifier> batch =
                        ids.subList(from, Math.min(from + MAX_KEYS_PER_DELETE, ids.size()));
                s3.deleteObjects(DeleteObjectsRequest.builder()
                        .bucket(bucket)
                        .delete(Delete.builder().objects(batch).build())
                        .build());
            }
        } catch (S3Exception e) {
            throw new MediaStorageException("Failed to delete objects " + keys, e);
        }
    }

    /** Bytes and content type of a fetched object. */
    public record StoredObject(byte[] bytes, String contentType) {
    }
}
