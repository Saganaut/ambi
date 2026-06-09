// Mapping from `DeckElement["kind"]` to the matching decorative graphic.
// Each entry is an svgr-loaded React component (see vite-plugin-svgr); the
// underlying .svg files live in src/assets/images/slide-types/.
import type { ComponentType, SVGProps } from "react";
import AllocationGraphic from "@assets/images/slide-types/allocation.svg?react";
import DrawingGraphic from "@assets/images/slide-types/drawing.svg?react";
import GridGraphic from "@assets/images/slide-types/grid.svg?react";
import MatchingGraphic from "@assets/images/slide-types/matching.svg?react";
import McqGraphic from "@assets/images/slide-types/mcq.svg?react";
import NumberGraphic from "@assets/images/slide-types/number.svg?react";
import PlaceOnImageGraphic from "@assets/images/slide-types/place-on-image.svg?react";
import QAndAGraphic from "@assets/images/slide-types/q-and-a.svg?react";
import RankingGraphic from "@assets/images/slide-types/ranking.svg?react";
import ScalesGraphic from "@assets/images/slide-types/scales.svg?react";
import SlideGraphic from "@assets/images/slide-types/slide.svg?react";
import TextGraphic from "@assets/images/slide-types/text.svg?react";

import { SlideType } from "@deck/store/deckEnums.gen";

//TODO: need images for TITLE, MEDIA, FOLLOW_UP.  Just using placeholders now.

export const slideTypeGraphics: Record<
  SlideType,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  TITLE: SlideGraphic,
  MCQ: McqGraphic,
  TEXT: TextGraphic,
  NUMBER: NumberGraphic,
  RANKING: RankingGraphic,
  SCALES: ScalesGraphic,
  Q_AND_A: QAndAGraphic,
  GRID: GridGraphic,
  PLACE_ON_IMAGE: PlaceOnImageGraphic,
  ALLOCATION: AllocationGraphic,
  MATCHING: MatchingGraphic,
  DRAWING: DrawingGraphic,
  MEDIA: SlideGraphic,
  FOLLOW_UP: SlideGraphic,
};
