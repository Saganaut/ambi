import type { Decorator } from "@storybook/react-vite";
import { SlideCanvas } from "@deck/components/DeckEditor/SlideDisplay/SlideCanvas";
import type { SlideType } from "@deck/store/deckEnums.gen";

// Wraps a slide-content story in the real editor canvas frame (border, themed
// background, brand/kind header, scrollable body) at a fixed size — so an
// isolated slide editor looks the way it does inside SlideDisplay instead of
// floating. Reuses the same SlideCanvas the app renders, so the frame can't
// drift. Pass the slide kind to drive the header graphic.
//
// Usage:  decorators: [withSlideCanvas("MCQ")]
export const withSlideCanvas =
  (slideType: SlideType = "MCQ"): Decorator =>
    (Story) => (
      <div>
        <SlideCanvas slideType={slideType}>
          <Story />
        </SlideCanvas>
      </div>
    );
