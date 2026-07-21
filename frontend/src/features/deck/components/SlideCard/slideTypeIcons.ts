// Mapping from slide type to its DS icon (Figma "Icon" set, Style=Tile),
// normalized to monochrome currentColor marks in assets/icons/slide-types/.
// Unlike the decorative slideTypeGraphics images these recolor via CSS, so
// the SlideCard icon box can tint glyph + background per type.
import type { ComponentType, SVGProps } from "react";
import AllocationIcon from "@assets/icons/slide-types/allocation.svg?react";
import AxisIcon from "@assets/icons/slide-types/axis.svg?react";
import ContentIcon from "@assets/icons/slide-types/content.svg?react";
import DrawingIcon from "@assets/icons/slide-types/drawing.svg?react";
import FollowUpIcon from "@assets/icons/slide-types/follow-up.svg?react";
import GridIcon from "@assets/icons/slide-types/grid.svg?react";
import InstructionIcon from "@assets/icons/slide-types/instruction.svg?react";
import MatchingIcon from "@assets/icons/slide-types/matching.svg?react";
import McqIcon from "@assets/icons/slide-types/mcq.svg?react";
import MediaIcon from "@assets/icons/slide-types/media.svg?react";
import NumberIcon from "@assets/icons/slide-types/number.svg?react";
import PlaceOnImageIcon from "@assets/icons/slide-types/place-on-image.svg?react";
import QAndAIcon from "@assets/icons/slide-types/q-and-a.svg?react";
import RankingIcon from "@assets/icons/slide-types/ranking.svg?react";
import ScalesIcon from "@assets/icons/slide-types/scales.svg?react";
import TextIcon from "@assets/icons/slide-types/text.svg?react";
import TitleIcon from "@assets/icons/slide-types/title.svg?react";

import { SlideType } from "@deck/store/deckEnums.gen";

export const slideTypeIcons: Record<
  SlideType,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  TITLE: TitleIcon,
  CONTENT: ContentIcon,
  MCQ: McqIcon,
  TEXT: TextIcon,
  NUMBER: NumberIcon,
  RANKING: RankingIcon,
  SCALES: ScalesIcon,
  Q_AND_A: QAndAIcon,
  GRID: GridIcon,
  AXIS: AxisIcon,
  PLACE_ON_IMAGE: PlaceOnImageIcon,
  ALLOCATION: AllocationIcon,
  MATCHING: MatchingIcon,
  DRAWING: DrawingIcon,
  MEDIA: MediaIcon,
  INSTRUCTION: InstructionIcon,
  FOLLOW_UP: FollowUpIcon,
};
