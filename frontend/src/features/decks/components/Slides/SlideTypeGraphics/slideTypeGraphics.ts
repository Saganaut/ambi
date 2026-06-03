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
import WordCloudGraphic from "@assets/images/slide-types/word-cloud.svg?react";
import { type DeckElement } from "@shared/types/elements";

export type ElementKind = DeckElement["kind"];

export const slideTypeGraphics: Record<
  ElementKind,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  Slide: SlideGraphic,
  McqQuestion: McqGraphic,
  TextQuestion: TextGraphic,
  NumberQuestion: NumberGraphic,
  RankingQuestion: RankingGraphic,
  ScalesQuestion: ScalesGraphic,
  QAndAQuestion: QAndAGraphic,
  GridQuestion: GridGraphic,
  PlaceOnImageQuestion: PlaceOnImageGraphic,
  WordCloudQuestion: WordCloudGraphic,
  AllocationQuestion: AllocationGraphic,
  MatchingQuestion: MatchingGraphic,
  DrawingQuestion: DrawingGraphic,
};
