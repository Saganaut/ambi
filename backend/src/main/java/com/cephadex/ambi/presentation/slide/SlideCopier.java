package com.cephadex.ambi.presentation.slide;

import org.bson.Document;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.stereotype.Component;

/**
 * Deep-copies a {@link Slide} through the <em>persistence</em> view: the slide
 * is written to an in-memory {@link Document} with the very converter Spring
 * Data uses to store it, then read straight back as a fresh object graph.
 *
 */
@Component
public class SlideCopier {

    private final MappingMongoConverter converter;

    public SlideCopier(MappingMongoConverter converter) {
        this.converter = converter;
    }

    /**

     * @param source the slide to copy
     * @return a new slide equal to {@code source} field for field
     */
    public Slide deepCopy(Slide source) {
        Document document = new Document();
        converter.write(source, document);
        return converter.read(Slide.class, document);
    }
}
