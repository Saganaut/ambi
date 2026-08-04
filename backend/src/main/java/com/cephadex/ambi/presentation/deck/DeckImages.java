package com.cephadex.ambi.presentation.deck;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.MediaContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.RankingContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlaceItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.RankItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;

/**
 * The single walker over every {@link AppImage} embedded anywhere in a
 * {@link Deck} — deck/slide cover and background slots plus each content type's
 * image-bearing fields. {@code DeckImageLifecycleService} leans on it for
 * copy-on-select adoption and removed-placement cleanup, so it must stay
 * exhaustive; {@code DeckImagesTest} reflects over the {@code SlideContent}
 * subtypes and fails the build when a new image-bearing type or field is not
 * collected here.
 */
public final class DeckImages {

    private DeckImages() {
    }

    /** Every embedded image in the deck (nulls excluded, duplicates kept). */
    public static List<AppImage> images(Deck deck) {
        List<AppImage> images = new ArrayList<>();
        add(images, deck.getCoverImage());
        add(images, deck.getBackgroundImage());
        for (Slide slide : deck.getSlides()) {
            add(images, slide.getCoverImage());
            add(images, slide.getBackgroundImage());
            images.addAll(images(slide.getContent()));
        }
        return images;
    }

    /** Every embedded image in one slide content body (nulls excluded). */
    public static List<AppImage> images(SlideContent content) {
        List<AppImage> images = new ArrayList<>();
        switch (content) {
            case MediaContent media -> add(images, media.image());
            case PlaceOnImageContent place -> {
                add(images, place.image());
                addAll(images, place.items(), PlaceItem::image);
            }
            case DrawingContent drawing -> {
                add(images, drawing.imagePrompt());
                add(images, drawing.correctImage());
            }
            case McqContent mcq -> addAll(images, mcq.options(), McqOption::image);
            case AllocationContent allocation -> addAll(images, allocation.options(), McqOption::image);
            case RankingContent ranking -> addAll(images, ranking.items(), RankItem::image);
            case ScalesContent scales -> addAll(images, scales.items(), ScaleItem::image);
            case GridContent grid -> addAll(images, grid.items(), GridItem::image);
            case AxisContent axis -> addAll(images, axis.items(), AxisItem::image);
            case MatchingContent matching -> {
                addAll(images, matching.left(), MatchItem::image);
                addAll(images, matching.right(), MatchItem::image);
            }
            case null, default -> {
                // Remaining content kinds carry no images (see DeckImagesTest).
            }
        }
        return images;
    }

    /** Every stored S3 key backing the deck's internal images (external → none). */
    public static Set<String> keys(Deck deck) {
        Set<String> keys = new LinkedHashSet<>();
        for (AppImage image : images(deck)) {
            keys.addAll(ImageKeys.allKeys(image));
        }
        return keys;
    }

    private static void add(List<AppImage> images, AppImage image) {
        if (image != null) {
            images.add(image);
        }
    }

    private static <T> void addAll(List<AppImage> images, List<T> items,
            Function<T, AppImage> imageOf) {
        if (items == null) {
            return;
        }
        for (T item : items) {
            if (item != null) {
                add(images, imageOf.apply(item));
            }
        }
    }
}
