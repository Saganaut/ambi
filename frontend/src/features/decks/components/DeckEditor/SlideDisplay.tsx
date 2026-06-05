/**
 * Centre canvas of the deck editor. Renders the element-kind-specific authoring
 * surface for whichever element the route's `slideId` is pointing at. The
 * sidebar / header chrome (slide-kind icon, footer) is owned here; the actual
 * field editors live in SlideContentTypes/.
 */
import { getRouteApi } from "@tanstack/react-router";
import styles from "./SlideDisplay.module.css";

import { McqSlideContent } from "./SlideContentTypes/McqSlideContent/McqSlideContent";
import { TextSlideContent } from "./SlideContentTypes/TextSlideContent/TextSlideContent";
import { NumberSlideContent } from "./SlideContentTypes/NumberSlideContent/NumberSlideContent";
import { RankingSlideContent } from "./SlideContentTypes/RankingSlideContent/RankingSlideContent";
import { ScalesSlideContent } from "./SlideContentTypes/ScalesSlideContent/ScalesSlideContent";
import { QAndASlideContent } from "./SlideContentTypes/QAndASlideContent/QAndASlideContent";
import { GridSlideContent } from "./SlideContentTypes/GridSlideContent/GridSlideContent";
import { PlaceOnImageSlideContent } from "./SlideContentTypes/PlaceOnImageSlideContent/PlaceOnImageSlideContent";
import { AllocationSlideContent } from "./SlideContentTypes/AllocationSlideContent/AllocationSlideContent";
import { MatchingSlideContent } from "./SlideContentTypes/MatchingSlideContent/MatchingSlideContent";
import { DrawingSlideContent } from "./SlideContentTypes/DrawingSlideContent/DrawingSlideContent";
import { CephadexLogo } from "@/shared/components/Graphic/CephadexLogo";
import { SlideTypeGraphicSvg } from "../Slides/SlideTypeGraphics/SlideTypeGraphic";
import { useSlide } from "../../hooks/useSlide";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const SlideDisplay = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();

  const { getSlide } = useSlide(deckId);

  if (slideId == null) return <p>No slide found</p>;

  const slide = getSlide(slideId);

  if (slide == null) return <p> Error </p>;
  console.log("slide", slide);
  const renderBody = () => {
    switch (slide.content.contentType) {
      case "MCQ":
        return <McqSlideContent />;
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
        return <p> Not implemented</p>;
      case "TITLE":
        return <p> Not implemented</p>;
      case "MEDIA":
        return <p> Not implemented</p>;
      default:
        return <div>No slide selected</div>;
    }
  };
  console.log("slide", slide);
  return (
    <div
      className={styles.slideDisplay}
      // style={
      //   {
      //     "--background-image": backgroundUrl
      //       ? `url("${backgroundUrl}")`
      //       : "none",
      //   } as React.CSSProperties
      // }
    >
      <div className={styles.slideHeader}>
        <CephadexLogo size={"md"} />{" "}
        <SlideTypeGraphicSvg slideType={slide.content.contentType} />
      </div>
      <div className={styles.slideBody}>{renderBody()}</div>
    </div>
  );
};

export { SlideDisplay };
