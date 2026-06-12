/**
 * Centre canvas of the deck editor. Renders the element-kind-specific authoring
 * surface for whichever element the route's `slideId` is pointing at. The
 * sidebar / header chrome (slide-kind icon, footer) is owned here; the actual
 * field editors live in SlideContentTypes/.
 */
import { getRouteApi } from "@tanstack/react-router";
import { SlideCanvas } from "./SlideCanvas";

import { McqSlideContent } from "../SlideContent/McqSlideContent/McqSlideContent";
import { TextSlideContent } from "../SlideContent/TextSlideContent/TextSlideContent";
import { NumberSlideContent } from "../SlideContent/NumberSlideContent/NumberSlideContent";
import { RankingSlideContent } from "../SlideContent/RankingSlideContent/RankingSlideContent";
import { ScalesSlideContent } from "../SlideContent/ScalesSlideContent/ScalesSlideContent";
import { QAndASlideContent } from "../SlideContent/QAndASlideContent/QAndASlideContent";
import { GridSlideContent } from "../SlideContent/GridSlideContent/GridSlideContent";
import { PlaceOnImageSlideContent } from "../SlideContent/PlaceOnImageSlideContent/PlaceOnImageSlideContent";
import { AllocationSlideContent } from "../SlideContent/AllocationSlideContent/AllocationSlideContent";
import { MatchingSlideContent } from "../SlideContent/MatchingSlideContent/MatchingSlideContent";
import { DrawingSlideContent } from "../SlideContent/DrawingSlideContent/DrawingSlideContent";
import { FollowUpSlideContent } from "../SlideContent/FollowUpSlideContent/FollowUpSlideContent";
import { useSlide } from "../../../hooks/useSlide";
import { useDeckEditor } from "@deck/hooks/useDeckEditor";
import { useDeck } from "@deck/hooks/useDeck";
import { useDeckTheme } from "@features/theme/hooks/useDeckTheme";
import React from "react";
import { Loader } from "@/shared/components/UIElements/Loader/Loader";
import { resolveSlideBackground } from "@/shared/utils/deckImages";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { ImagePickerSmall } from "../RightSidebar/shared/ImagePicker";


const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");





const SlideDisplay = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { slides } = useDeckEditor(deckId, slideId);

  const { getSlide, setSlideImage, clearSlideImage } = useSlide(deckId);
  // Per-deck theme, scoped to just the slide canvas — the surrounding editor
  // chrome keeps the user's global theme.
  const { deck } = useDeck(deckId);
  const { style: themeStyle, appearance } = useDeckTheme(deck?.themeId);
  const openPicker = useGalleryPicker();

  const slide = slideId ? getSlide(slideId) : slides[0];
  const navigate = routeApi.useNavigate();
  const backgroundUrl = resolveSlideBackground(deck?.backgroundImage, slide?.backgroundImage, undefined, slide?.hideBackground)
  // useEffect justification: If there's no slideId in the URL, but there are slides in the deck
  // Load that slide id so it can be picked up by the rest of the component.
  React.useEffect(() => {
    if (!slideId && slides && slides.length > 0) {
      navigate({
        search: { slideId: slides[0].id },
        replace: true,
      });
    }
  }, [slideId, slides, navigate]);

  if (slideId == null) return <Loader />;

  if (slide == null) return <p> Error </p>;
  const slideContentImgUrl = slide.coverImage?.variants?.XL

  const renderBody = () => {
    switch (slide.content.contentType) {
      case "MCQ":
        return <McqSlideContent deckId={deckId} slideId={slide.id} />;
      case "TEXT":
        return <TextSlideContent />;
      case "NUMBER":
        return <NumberSlideContent />;
      case "RANKING":
        return <RankingSlideContent />;
      case "SCALES":
        return <ScalesSlideContent />;
      case "Q_AND_A":
        return <QAndASlideContent />;
      case "GRID":
        return <GridSlideContent />;
      case "PLACE_ON_IMAGE":
        return <PlaceOnImageSlideContent />;
      case "ALLOCATION":
        return <AllocationSlideContent />;
      case "MATCHING":
        return <MatchingSlideContent />;
      case "DRAWING":
        return <DrawingSlideContent />;
      case "FOLLOW_UP":
        return <FollowUpSlideContent deckId={deckId} slideId={slide.id} />;
      case "TITLE":
        return <p> Not implemented</p>;
      case "MEDIA":
        return <p> Not implemented</p>;
      default:
        return <div>No slide selected</div>;
    }
  };

  return (
    <SlideCanvas
      slideType={slide.content.contentType}
      themeStyle={themeStyle}
      appearance={appearance}
      backgroundUrl={backgroundUrl}
      slideContentImgUrl={slideContentImgUrl}
    >
      {renderBody()}
      <ImagePickerSmall
        image={slide.coverImage}
        onPick={() => {
          openPicker(
            (image) => {
              setSlideImage(slide.id, "cover", image);
            },
            {
              title: "Slide background image",
              cropWidth: 16,
              cropHeight: 9,
            },
          );
        }}
        onClear={() => {
          clearSlideImage(slide.id, "cover");
        }}
      />
      <div>

      </div>
    </SlideCanvas>
  );
};

export { SlideDisplay };
