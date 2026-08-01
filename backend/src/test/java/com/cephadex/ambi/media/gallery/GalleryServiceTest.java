package com.cephadex.ambi.media.gallery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.media.storage.S3StorageService.StoredObject;
import com.cephadex.ambi.org.OrgMembership;
import com.cephadex.ambi.org.OrgRoleResolver;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Permission gating and get-or-create behaviour of {@code GalleryService}. The
 * predicates live on the {@link Gallery} aggregate; this exercises the service's
 * choice of capability per operation and its lazy provisioning. Personal
 * galleries resolve without I/O, so the user store stays untouched there; org
 * cases mock {@code UserService} to supply the requester's org role.
 *
 * <p>Also covers the image list's request normalization: sorting is whitelisted
 * to {@code name}/{@code createdAt} (anything else degrades to newest-first), the
 * page size is capped, and a non-blank {@code search} switches to the
 * name-contains read.
 */
class GalleryServiceTest {

    private GalleryRepository galleryRepository;
    private GalleryImageRepository imageRepository;
    private UserService userService;
    private S3StorageService storage;
    private GalleryService galleryService;

    @BeforeEach
    void setUp() {
        galleryRepository = mock(GalleryRepository.class);
        imageRepository = mock(GalleryImageRepository.class);
        userService = mock(UserService.class);
        storage = mock(S3StorageService.class);
        galleryService = new GalleryService(galleryRepository, imageRepository,
                new OrgRoleResolver(userService), storage);
        when(galleryRepository.save(any(Gallery.class))).thenAnswer(inv -> inv.getArgument(0));
        when(imageRepository.save(any(GalleryImage.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ── Get-or-create ─────────────────────────────────────────────────────────

    @Test
    void getOrCreateForUserProvisionsWhenAbsent() {
        when(galleryRepository.findByOwnershipTypeAndOwnershipOwnerId(OwnershipType.USER, "owner-1"))
                .thenReturn(Optional.empty());

        Gallery gallery = galleryService.getOrCreateForUser(principal("owner-1"));

        assertThat(gallery.getId()).isNotBlank();
        assertThat(gallery.isUserOwned()).isTrue();
        assertThat(gallery.getOwnership().ownerId()).isEqualTo("owner-1");
        assertThat(gallery.getCreatorUserId()).isEqualTo("owner-1");
        verify(galleryRepository).save(any(Gallery.class));
    }

    @Test
    void getOrCreateForUserReturnsExistingWithoutSaving() {
        Gallery existing = personalGallery("owner-1");
        when(galleryRepository.findByOwnershipTypeAndOwnershipOwnerId(OwnershipType.USER, "owner-1"))
                .thenReturn(Optional.of(existing));

        Gallery gallery = galleryService.getOrCreateForUser(principal("owner-1"));

        assertThat(gallery).isSameAs(existing);
        verify(galleryRepository, never()).save(any(Gallery.class));
    }

    // ── Personal permissions ────────────────────────────────────────────────────

    @Test
    void permissionsForOwnerGrantsEverything() {
        ViewerPermissions perms = galleryService.permissionsFor(personalGallery("owner-1"), principal("owner-1"));

        assertThat(perms.canView()).isTrue();
        assertThat(perms.canEdit()).isTrue();
        assertThat(perms.canManage()).isTrue();
    }

    @Test
    void permissionsForStrangerOnPersonalGalleryGrantsNothing() {
        ViewerPermissions perms = galleryService.permissionsFor(personalGallery("owner-1"), principal("intruder"));

        assertThat(perms.canView()).isFalse();
        assertThat(perms.canEdit()).isFalse();
        assertThat(perms.canManage()).isFalse();
    }

    // ── Org permissions ──────────────────────────────────────────────────────────

    @Test
    void orgOwnerCanManageMemberCanOnlyView() {
        Gallery gallery = orgGallery("org-1");
        memberOf("member", "org-1", OrgRole.USER);
        memberOf("admin", "org-1", OrgRole.ADMIN);
        memberOf("boss", "org-1", OrgRole.OWNER);

        ViewerPermissions member = galleryService.permissionsFor(gallery, principal("member"));
        assertThat(member.canView()).isTrue();
        assertThat(member.canEdit()).isFalse();
        assertThat(member.canManage()).isFalse();

        ViewerPermissions admin = galleryService.permissionsFor(gallery, principal("admin"));
        assertThat(admin.canEdit()).isTrue();
        assertThat(admin.canManage()).isFalse();

        ViewerPermissions owner = galleryService.permissionsFor(gallery, principal("boss"));
        assertThat(owner.canManage()).isTrue();
    }

    @Test
    void nonMemberCannotViewOrgGallery() {
        Gallery gallery = orgGallery("org-1");
        when(userService.findById("outsider")).thenReturn(Optional.of(userWithRoles("outsider")));

        ViewerPermissions perms = galleryService.permissionsFor(gallery, principal("outsider"));

        assertThat(perms.canView()).isFalse();
    }

    // ── Image operations ─────────────────────────────────────────────────────────

    @Test
    void addImageWrapsAppImageAndStampsCreator() {
        Gallery gallery = personalGallery("owner-1");
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(gallery));

        GalleryImage saved = galleryService.addImage("gal-1", externalImage(), "logo", principal("owner-1"));

        assertThat(saved.getGalleryId()).isEqualTo("gal-1");
        assertThat(saved.getImage().getExternalSrc()).isEqualTo("https://example.test/x.png");
        assertThat(saved.getName()).isEqualTo("logo");
        assertThat(saved.getCreatorUserId()).isEqualTo("owner-1");
    }

    @Test
    void addImageByStrangerIsForbidden() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));

        assertThatThrownBy(() -> galleryService.addImage("gal-1", externalImage(), null, principal("intruder")))
                .isInstanceOf(ForbiddenException.class);
        verify(imageRepository, never()).save(any(GalleryImage.class));
    }

    @Test
    void getImageMissingThrowsNotFound() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));
        when(imageRepository.findByIdAndGalleryId("nope", "gal-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> galleryService.getImage("gal-1", "nope", principal("owner-1")))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void getImageFileStreamsTheStoredOriginal() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));
        storedImage("img-1", internalImage("gallery/abc/original"));
        when(storage.get("gallery/abc/original"))
                .thenReturn(new StoredObject(new byte[] { 1, 2, 3 }, "image/png"));

        StoredObject file = galleryService.getImageFile("gal-1", "img-1", principal("owner-1"));

        assertThat(file.bytes()).containsExactly(1, 2, 3);
        assertThat(file.contentType()).isEqualTo("image/png");
    }

    @Test
    void getImageFileOfExternalReferenceThrowsNotFound() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));
        storedImage("img-2", externalImage());

        // An external image owns no stored object, so there is no file to serve.
        assertThatThrownBy(() -> galleryService.getImageFile("gal-1", "img-2", principal("owner-1")))
                .isInstanceOf(NotFoundException.class);
        verify(storage, never()).get(any());
    }

    @Test
    void getImageFileThrowsNotFoundWhenTheObjectIsGone() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));
        storedImage("img-3", internalImage("gallery/gone/original"));
        when(storage.get("gallery/gone/original")).thenReturn(null);

        assertThatThrownBy(() -> galleryService.getImageFile("gal-1", "img-3", principal("owner-1")))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void getImageFileByStrangerIsForbidden() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));

        assertThatThrownBy(() -> galleryService.getImageFile("gal-1", "img-1", principal("intruder")))
                .isInstanceOf(ForbiddenException.class);
        verify(storage, never()).get(any());
    }

    @Test
    void removeImageDeletesBackingBytesThenDocument() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));
        GalleryImage image = new GalleryImage();
        image.setId("img-1");
        image.setGalleryId("gal-1");
        image.setImage(internalImage("gallery/abc/original"));
        when(imageRepository.findByIdAndGalleryId("img-1", "gal-1")).thenReturn(Optional.of(image));

        galleryService.removeImage("gal-1", "img-1", principal("owner-1"));

        // Bytes (original + every variant) are freed, then the document is dropped.
        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<String>> keys = ArgumentCaptor.forClass(java.util.Collection.class);
        InOrder order = inOrder(storage, imageRepository);
        order.verify(storage).delete(keys.capture());
        order.verify(imageRepository).delete(image);
        assertThat(keys.getValue()).contains("gallery/abc/original", "gallery/abc/sm.webp");
    }

    @Test
    void removeImageOfExternalReferenceTouchesNoStorage() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));
        GalleryImage image = new GalleryImage();
        image.setId("img-2");
        image.setGalleryId("gal-1");
        image.setImage(externalImage());
        when(imageRepository.findByIdAndGalleryId("img-2", "gal-1")).thenReturn(Optional.of(image));

        galleryService.removeImage("gal-1", "img-2", principal("owner-1"));

        // External images own no S3 objects — delete is still called, with nothing.
        verify(storage).delete(java.util.List.of());
        verify(imageRepository).delete(image);
    }

    @Test
    void deleteRemovesImagesThenGallery() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));

        galleryService.delete("gal-1", principal("owner-1"));

        verify(imageRepository).deleteByGalleryId("gal-1");
        verify(galleryRepository).delete(any(Gallery.class));
    }

    // ── Listing images ──────────────────────────────────────────────────────────

    @Test
    void listImagesSortsNewestFirstWhenNoSortIsAsked() {
        viewableGallery();

        galleryService.listImages("gal-1", principal("owner-1"), null, PageRequest.of(0, 6));

        assertThat(listedPageable().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Test
    void listImagesHonoursAWhitelistedSortField() {
        viewableGallery();

        galleryService.listImages("gal-1", principal("owner-1"), null,
                PageRequest.of(1, 6, Sort.by(Sort.Direction.ASC, "name")));

        Pageable used = listedPageable();
        assertThat(used.getSort()).isEqualTo(Sort.by(Sort.Direction.ASC, "name"));
        assertThat(used.getPageNumber()).isEqualTo(1);
    }

    @Test
    void listImagesFallsBackToTheDefaultSortForAnUnknownField() {
        viewableGallery();

        // An unknown field would otherwise reach Mongo verbatim; it degrades to
        // the default rather than failing the browse.
        galleryService.listImages("gal-1", principal("owner-1"), null,
                PageRequest.of(0, 6, Sort.by(Sort.Direction.ASC, "creatorUserId")));

        assertThat(listedPageable().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Test
    void listImagesCapsAnOversizedPageRequest() {
        viewableGallery();

        galleryService.listImages("gal-1", principal("owner-1"), null, PageRequest.of(0, 5000));

        assertThat(listedPageable().getPageSize()).isEqualTo(100);
    }

    @Test
    void listImagesNarrowsByNameWhenSearchIsSupplied() {
        viewableGallery();

        galleryService.listImages("gal-1", principal("owner-1"), "  sun  ", PageRequest.of(0, 6));

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(imageRepository).findByGalleryIdAndNameContainingIgnoreCase(
                eq("gal-1"), eq("sun"), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(6);
        verify(imageRepository, never()).findByGalleryId(any(), any());
    }

    @Test
    void listImagesIgnoresABlankSearch() {
        viewableGallery();

        galleryService.listImages("gal-1", principal("owner-1"), "   ", PageRequest.of(0, 6));

        verify(imageRepository).findByGalleryId(eq("gal-1"), any(Pageable.class));
        verify(imageRepository, never())
                .findByGalleryIdAndNameContainingIgnoreCase(any(), any(), any());
    }

    @Test
    void listImagesByStrangerIsForbidden() {
        viewableGallery();

        assertThatThrownBy(() -> galleryService.listImages("gal-1", principal("intruder"), null,
                PageRequest.of(0, 6)))
                .isInstanceOf(ForbiddenException.class);
        verify(imageRepository, never()).findByGalleryId(any(), any());
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    private void viewableGallery() {
        when(galleryRepository.findById("gal-1")).thenReturn(Optional.of(personalGallery("owner-1")));
    }

    /** The page request the service actually handed to the unfiltered repository read. */
    private Pageable listedPageable() {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(imageRepository).findByGalleryId(eq("gal-1"), captor.capture());
        return captor.getValue();
    }


    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId,
                UserLevel.USER, AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }

    /** Register an image in gal-1 and return it. */
    private GalleryImage storedImage(String imageId, AppImage image) {
        GalleryImage galleryImage = new GalleryImage();
        galleryImage.setId(imageId);
        galleryImage.setGalleryId("gal-1");
        galleryImage.setImage(image);
        when(imageRepository.findByIdAndGalleryId(imageId, "gal-1"))
                .thenReturn(Optional.of(galleryImage));
        return galleryImage;
    }

    private static Gallery personalGallery(String ownerId) {
        Gallery gallery = new Gallery();
        gallery.setId("gal-1");
        gallery.setOwnership(new Ownership(OwnershipType.USER, ownerId));
        gallery.setCreatorUserId(ownerId);
        return gallery;
    }

    private static Gallery orgGallery(String orgId) {
        Gallery gallery = new Gallery();
        gallery.setId("gal-org");
        gallery.setOwnership(new Ownership(OwnershipType.ORGANIZATION, orgId));
        gallery.setOrganizationId(orgId);
        return gallery;
    }

    private void memberOf(String userId, String orgId, OrgRole role) {
        User user = userWithRoles(userId);
        user.setOrgRoles(List.of(new OrgMembership(orgId, role)));
        when(userService.findById(eq(userId))).thenReturn(Optional.of(user));
    }

    private static User userWithRoles(String userId) {
        User user = new User();
        user.setId(userId);
        return user;
    }

    private static AppImage externalImage() {
        AppImage image = new AppImage();
        image.setExternal(true);
        image.setExternalSrc("https://example.test/x.png");
        return image;
    }

    private static AppImage internalImage(String srcKey) {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(srcKey);
        image.setVariants(ImageKeys.variantsFor(srcKey));
        return image;
    }
}
