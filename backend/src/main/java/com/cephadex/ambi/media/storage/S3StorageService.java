package com.cephadex.ambi.media.storage;

import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
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

    /** Bytes and content type of a fetched object. */
    public record StoredObject(byte[] bytes, String contentType) {
    }
}
