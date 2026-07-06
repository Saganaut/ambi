/**
 * Centre canvas of the deck editor. Renders the element-kind-specific authoring
 * surface for whichever element the route's `slideId` is pointing at. The
 * sidebar / header chrome (slide-kind icon, footer) is owned here; the actual
 * field editors live in SlideContentTypes/.
 */
import { getRouteApi } from "@tanstack/react-router";
import { SlideCanvas } from "./SlideCanvas";

import { Loader } from "@/shared/components/UIElements/Loader/Loader";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { resolveSlideBackground, resolveSlideBackgroundColor } from "@/shared/utils/deckImages";
import { useDeckEditor } from "@deck/hooks/useDeckEditor";
import { useDeckQuery } from "@deck/hooks/useDeckQuery";
import { useDeckTheme } from "@features/theme/hooks/useDeckTheme";
import React, { Suspense, lazy } from "react";
import { slotMappingOptions, type SlotMapping } from "../../../contexts/ImageSlot.types";
import { useSlide } from "../../../hooks/useSlide";
import { McqSlideProvider } from "../SlideContent/McqSlideContent/McqSlideProvider";
import { ChartTypePicker } from "./ChartTypePicker/ChartTypePicker";
import { CoverImagePicker } from "./CoverImagePicker/CoverImagePicker";
// The per-type authoring surfaces are lazy so only the active slide's editor is
// in the editor chunk — the other 11 never download or parse. Each is a named
// export, hence the `.then(...)` shim to React.lazy's default-export contract.
// McqSlideProvider stays eager: it's a tiny context wrapper, not an editor body.
const AllocationSlideContent = lazy(() =>
  import("../SlideContent/AllocationSlideContent/AllocationSlideContent").then((m) => ({
    default: m.AllocationSlideContent,
  })),
);
const DrawingSlideContent = lazy(() =>
  import("../SlideContent/DrawingSlideContent/DrawingSlideContent").then((m) => ({
    default: m.DrawingSlideContent,
  })),
);
const FollowUpSlideContent = lazy(() =>
  import("../SlideContent/FollowUpSlideContent/FollowUpSlideContent").then((m) => ({
    default: m.FollowUpSlideContent,
  })),
);
const GridSlideContent = lazy(() =>
  import("../SlideContent/GridSlideContent/GridSlideContent").then((m) => ({
    default: m.GridSlideContent,
  })),
);
const MatchingSlideContent = lazy(() =>
  import("../SlideContent/MatchingSlideContent/MatchingSlideContent").then((m) => ({
    default: m.MatchingSlideContent,
  })),
);
const McqSlideContent = lazy(() =>
  import("../SlideContent/McqSlideContent/McqSlideContent").then((m) => ({
    default: m.McqSlideContent,
  })),
);
const NumberSlideContent = lazy(() =>
  import("../SlideContent/NumberSlideContent/NumberSlideContent").then((m) => ({
    default: m.NumberSlideContent,
  })),
);
const PlaceOnImageSlideContent = lazy(() =>
  import("../SlideContent/PlaceOnImageSlideContent/PlaceOnImageSlideContent").then((m) => ({
    default: m.PlaceOnImageSlideContent,
  })),
);
const QAndASlideContent = lazy(() =>
  import("../SlideContent/QAndASlideContent/QAndASlideContent").then((m) => ({
    default: m.QAndASlideContent,
  })),
);
const RankingSlideContent = lazy(() =>
  import("../SlideContent/RankingSlideContent/RankingSlideContent").then((m) => ({
    default: m.RankingSlideContent,
  })),
);
const ScalesSlideContent = lazy(() =>
  import("../SlideContent/ScalesSlideContent/ScalesSlideContent").then((m) => ({
    default: m.ScalesSlideContent,
  })),
);
const TextSlideContent = lazy(() =>
  import("../SlideContent/TextSlideContent/TextSlideContent").then((m) => ({
    default: m.TextSlideContent,
  })),
);
const TitleSlideContent = lazy(() =>
  import("../SlideContent/TitleSlideContent/TitleSlideContent").then((m) => ({
    default: m.TitleSlideContent,
  })),
);
const ContentSlideContent = lazy(() =>
  import("../SlideContent/ContentSlideContent/ContentSlideContent").then((m) => ({
    default: m.ContentSlideContent,
  })),
);
const MediaSlideContent = lazy(() =>
  import("../SlideContent/MediaSlideContent/MediaSlideContent").then((m) => ({
    default: m.MediaSlideContent,
  })),
);
const InstructionSlideContent = lazy(() =>
  import("../SlideContent/InstructionSlideContent/InstructionSlideContent").then((m) => ({
    default: m.InstructionSlideContent,
  })),
);

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const SlideDisplay = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { slides } = useDeckEditor(deckId, slideId);

  const { getSlide, setSlideImage, clearSlideImage } = useSlide(deckId);
  // Per-deck theme, scoped to just the slide canvas — the surrounding editor
  // chrome keeps the user's global theme.
  const { deck } = useDeckQuery(deckId);
  const { style: themeStyle, appearance } = useDeckTheme(deck?.themeId);
  const openPicker = useGalleryPicker();

  const slide = slideId ? getSlide(slideId) : slides[0];
  const navigate = routeApi.useNavigate();
  const backgroundUrl = resolveSlideBackground(
    deck?.backgroundImage,
    slide?.backgroundImage,
    undefined,
    slide?.hideBackground,
  );
  const backgroundColor = resolveSlideBackgroundColor(
    deck?.backgroundColor,
    slide?.backgroundColor,
    slide?.hideBackground,
  );
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
  const slideContentImgUrl = slide.coverImage?.variants?.XL;
  const defaultPlacement = slotMappingOptions[0];

  const updateSlidePlacement = (placement: SlotMapping) => {
    if (slide.coverImage == null) return;
    setSlideImage(slide.id, "cover", slide.coverImage, placement);
  };

  const renderBody = () => {
    switch (slide.content.contentType) {
      case "MCQ":
        return (
          <McqSlideProvider deckId={deckId} slideId={slideId}>
            <McqSlideContent />
          </McqSlideProvider>
        );
      case "TEXT":
        return <TextSlideContent deckId={deckId} slideId={slideId} />;
      case "NUMBER":
        return <NumberSlideContent deckId={deckId} slideId={slideId} />;
      case "RANKING":
        return <RankingSlideContent deckId={deckId} slideId={slideId} />;
      case "SCALES":
        return <ScalesSlideContent deckId={deckId} slideId={slideId} />;
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
        return <TitleSlideContent deckId={deckId} slideId={slideId} />;
      case "CONTENT":
        return <ContentSlideContent deckId={deckId} slideId={slideId} />;
      case "MEDIA":
        return <MediaSlideContent deckId={deckId} slideId={slideId} />;
      case "INSTRUCTION":
        return <InstructionSlideContent deckId={deckId} slideId={slideId} />;
      default:
        return <div>No slide selected</div>;
    }
  };

  return (
    <>
      <SlideCanvas
        slideType={slide.content.contentType}
        themeStyle={themeStyle}
        appearance={appearance}
        backgroundUrl={backgroundUrl}
        backgroundColor={backgroundColor}
        slideContentImgUrl={slideContentImgUrl}
      >
        <Suspense fallback={<Loader />}>{renderBody()}</Suspense>
        <CoverImagePicker
          image={slide.coverImage}
          updateSlidePlacement={updateSlidePlacement}
          onPick={() => {
            openPicker(
              (image) => {
                setSlideImage(slide.id, "cover", image, defaultPlacement);
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
        <ChartTypePicker deckId={deckId} slideId={slideId} />
        <div></div>
      </SlideCanvas>{" "}
    </>
  );
};

export { SlideDisplay };
