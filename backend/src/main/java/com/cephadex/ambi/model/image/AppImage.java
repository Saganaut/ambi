package com.cephadex.ambi.model.image;

import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.cephadex.ambi.model.enums.ImageSizeOptions;

import lombok.Data;

@Data
@Document(collection = "app_images")
public class AppImage {

    @Id
    private String id;

    private boolean isExternal;

    // The src is the S3 key of the original uploaded img
    private String src;

    // if external is true we use this full url initially
    // When we have saved it internally we can toggle isExternal
    // and use the internal one
    private String externalSrc;

    private String altText;

    // The string is the S3 key
    private Map<ImageSizeOptions, String> variants;

    private Map<String, Object> metadata;
}
