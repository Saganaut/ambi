package com.cephadex.ambi.media.gallery;

import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.media.AppImage;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * A single owned image living in a {@link Gallery}. This is the persisted,
 * standalone home for an uploaded image — its own document keyed by
 * {@code galleryId} so a gallery's images query and paginate independently of
 * the container (and never bump the 16&nbsp;MB document cap).
 *
 * <p>The pixels-and-keys part is the embedded {@link AppImage} value object —
 * the very same type decks, slides and themes embed. When a user <em>selects</em>
 * this image for a usage site, a <em>copy</em> of that {@code AppImage} is
 * embedded there; deleting this {@code GalleryImage} therefore never breaks an
 * existing deck.
 *
 * <p>There is no permission logic here: a {@code GalleryImage} is authorized
 * through its owning {@link Gallery} (load the gallery, check its predicate).
 */
@Getter
@Setter
@ToString
@Document(collection = "gallery_images")
public class GalleryImage extends Auditable {

    // id is inherited from BaseDocument (@Id String id), server-minted on add.

    @Indexed
    @Field("gallery_id")
    private String galleryId;

    // The embeddable value object consumers copy when they select this image.
    @Field("image")
    private AppImage image;

    @Indexed
    @Field("creator_user_id")
    private String creatorUserId;

    // Optional human label, distinct from AppImage.altText. Free for now; the
    // upload pipeline can default it from the original filename.
    @Field("name")
    private String name;

    // Optimistic-lock token AND the new-entity signal: with the id server-minted
    // before save, a null version is how Spring Data knows to INSERT (not replace),
    // which is what makes @CreatedDate fire. Mirrors Gallery/Deck.
    @Version
    @Field("version")
    private Long version;
}
