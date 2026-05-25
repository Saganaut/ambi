/**
 * Centre canvas of the deck editor. Renders the element-kind-specific authoring
 * surface for whichever element the route's `questionId` is pointing at. The
 * sidebar / header chrome (slide-kind icon, footer) is owned here; the actual
 * field editors live in SlideContentTypes/.
 */
import { useGetDeckQuery } from "@/store/BrainFlexApi";
import { getRouteApi } from "@tanstack/react-router";
import styles from "./SlideDisplay.module.css";
import { Loader } from "../Common/Loader/Loader";
import { CephadexLogo } from "../Graphic/CephadexLogo";
import { SlideTypeGraphicSvg } from "../Common/Slides/SlideTypeGraphics/SlideTypeGraphic";
import { largestUrl } from "@/utils/image";
import { SlideContent } from "./SlideContentTypes/SlideContent/SlideContent";
import { McqSlideContent } from "./SlideContentTypes/McqSlideContent/McqSlideContent";
import { TextSlideContent } from "./SlideContentTypes/TextSlideContent/TextSlideContent";
import { NumberSlideContent } from "./SlideContentTypes/NumberSlideContent/NumberSlideContent";
import { RankingSlideContent } from "./SlideContentTypes/RankingSlideContent/RankingSlideContent";
import { ScalesSlideContent } from "./SlideContentTypes/ScalesSlideContent/ScalesSlideContent";
import { QAndASlideContent } from "./SlideContentTypes/QAndASlideContent/QAndASlideContent";
import { GridSlideContent } from "./SlideContentTypes/GridSlideContent/GridSlideContent";
import { PlaceOnImageSlideContent } from "./SlideContentTypes/PlaceOnImageSlideContent/PlaceOnImageSlideContent";
import { WordCloudSlideContent } from "./SlideContentTypes/WordCloudSlideContent/WordCloudSlideContent";
import { AllocationSlideContent } from "./SlideContentTypes/AllocationSlideContent/AllocationSlideContent";
import { MatchingSlideContent } from "./SlideContentTypes/MatchingSlideContent/MatchingSlideContent";
import { DrawingSlideContent } from "./SlideContentTypes/DrawingSlideContent/DrawingSlideContent";

const routeApi = getRouteApi("/decks/$deckId/edit");

const SlideDisplay = () => {
  const { deckId } = routeApi.useParams();
  const { questionId } = routeApi.useSearch();

  const { element, isLoading } = useGetDeckQuery(
    { id: deckId },
    {
      selectFromResult: ({ data, isLoading }) => ({
        isLoading,
        element: data?.elements?.find((e) => e.id === questionId),
      }),
    },
  );

  const renderBody = () => {
    if (isLoading) return <Loader />;
    if (!element) {
      return (
        <p>No slide selected. Pick one from the left rail to start editing.</p>
      );
    }
    switch (element.kind) {
      case "Slide":
        return <SlideContent />;
      case "McqQuestion":
        return <McqSlideContent />;
      case "TextQuestion":
        return <TextSlideContent />;
      case "NumberQuestion":
        return <NumberSlideContent />;
      case "RankingQuestion":
        return <RankingSlideContent />;
      case "ScalesQuestion":
        return <ScalesSlideContent />;
      case "QAndAQuestion":
        return <QAndASlideContent />;
      case "GridQuestion":
        return <GridSlideContent />;
      case "PlaceOnImageQuestion":
        return <PlaceOnImageSlideContent />;
      case "WordCloudQuestion":
        return <WordCloudSlideContent />;
      case "AllocationQuestion":
        return <AllocationSlideContent />;
      case "MatchingQuestion":
        return <MatchingSlideContent />;
      case "DrawingQuestion":
        return <DrawingSlideContent />;
      default:
        return <div>No slide selected</div>;
    }
  };
  const backgroundUrl = element
    ? largestUrl(element.chrome?.background, `${element.id ?? ""}-background`)
    : null;

  return (
    <div
      className={styles.slideDisplay}
      style={
        {
          "--background-image": backgroundUrl ? `url("${backgroundUrl}")` : "none",
        } as React.CSSProperties
      }>
      <div className={styles.slideHeader}>
        <CephadexLogo size={"md"} />{" "}
        {element?.kind && <SlideTypeGraphicSvg kind={element.kind} />}
      </div>
      <div className={styles.slideBody}>{renderBody()}</div>
    </div>
  );
};

export { SlideDisplay };
