package com.cephadex.ambi.media.gallery;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.ImageIngestService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Controller-plumbing tests for the gallery upload route in isolation via
 * standalone {@code MockMvc}, mirroring {@code DeckControllerTest}. The ingest
 * pipeline and permission semantics live in their own services (mocked here);
 * this asserts the multipart route ingests bytes, delegates to the service, and
 * returns a 201. Presigning is applied centrally by {@code AppImageSerializer}
 * (covered in {@code AppImageJacksonTest}); standalone MockMvc uses a default
 * ObjectMapper without that module, so the response here carries the raw keys.
 */
@ExtendWith(MockitoExtension.class)
class GalleryControllerTest {

    @Mock
    private GalleryService galleryService;
    @Mock
    private ImageIngestService imageIngestService;

    private MockMvc mockMvc;
    private AmbiPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new AmbiPrincipal(
                IdentityState.REGISTERED, "user-1", "pub-1", UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        GalleryController controller = new GalleryController(galleryService, imageIngestService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private static GalleryImage storedImageWithVariant() {
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, "gallery/x/sm.webp");
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/x/original");
        image.setVariants(variants);

        GalleryImage gi = new GalleryImage();
        gi.setId("img-1");
        gi.setGalleryId("g1");
        gi.setImage(image);
        gi.setName("Hero");
        gi.setCreatorUserId("user-1");
        return gi;
    }

    @Test
    void uploadIngestsBytesPersistsAndReturnsHydrated201() throws Exception {
        AppImage ingested = new AppImage();
        ingested.setExternal(false);
        when(imageIngestService.ingest(any(), eq("image/png"), eq("hero.png"))).thenReturn(ingested);
        when(galleryService.addImage(eq("g1"), eq(ingested), eq("Hero"), any()))
                .thenReturn(storedImageWithVariant());

        MockMultipartFile file = new MockMultipartFile(
                "file", "hero.png", "image/png", new byte[] { 1, 2, 3 });

        mockMvc.perform(multipart("/api/galleries/g1/images/upload").file(file).param("name", "Hero"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("img-1"))
                // Raw key passes through here; presigning is the serializer's job.
                .andExpect(jsonPath("$.image.variants.SM").value("gallery/x/sm.webp"));

        verify(imageIngestService).ingest(any(), eq("image/png"), eq("hero.png"));
    }

    @Test
    void uploadDefaultsNameToFilenameWhenOmitted() throws Exception {
        AppImage ingested = new AppImage();
        when(imageIngestService.ingest(any(), any(), eq("hero.png"))).thenReturn(ingested);
        when(galleryService.addImage(any(), any(), any(), any()))
                .thenReturn(storedImageWithVariant());

        MockMultipartFile file = new MockMultipartFile(
                "file", "hero.png", "image/png", new byte[] { 1 });

        mockMvc.perform(multipart("/api/galleries/g1/images/upload").file(file))
                .andExpect(status().isCreated());

        ArgumentCaptor<String> name = ArgumentCaptor.forClass(String.class);
        verify(galleryService).addImage(eq("g1"), eq(ingested), name.capture(), any());
        assertThat(name.getValue()).isEqualTo("hero.png");
    }
}
