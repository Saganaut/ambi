package com.cephadex.ambi.media;

import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.media.enums.ImageSizeOptions;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Document(collection = "app_images")
public class AppImage {

    @Id
    private String id;

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
    @Field("external")
    private boolean external;

    // The src is the S3 key of the original uploaded img
    @Field("src_key")
    private String srcKey;

    // if external is true we use this full url initially
    // When we have saved it internally we can toggle isExternal
    // and use the internal one
    @Field("external_src")
    private String externalSrc;

    @Field("alt_text")
    private String altText;

    // The string is the S3 key
    @Field("variants")
    private Map<ImageSizeOptions, String> variants;

    @Field("metadata")
    private Map<String, Object> metadata;
}
