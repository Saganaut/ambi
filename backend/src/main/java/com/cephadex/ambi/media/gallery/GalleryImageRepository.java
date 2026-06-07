package com.cephadex.ambi.media.gallery;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GalleryImageRepository extends MongoRepository<GalleryImage, String> {

    /** A gallery's images, newest-first paging is the caller's to choose via Pageable. */
    Page<GalleryImage> findByGalleryId(String galleryId, Pageable pageable);

    /** A single image scoped to its gallery, so a stray id can't cross galleries. */
    Optional<GalleryImage> findByIdAndGalleryId(String id, String galleryId);

    /** How many images a gallery holds — stamped onto the gallery response. */
    long countByGalleryId(String galleryId);

    /** Remove every image of a gallery — used when the gallery itself is deleted. */
    void deleteByGalleryId(String galleryId);
}
