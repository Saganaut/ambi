/**
 * Author surface for a non-interactive Slide (title screen / section divider /
 * callout / content / end card). Captures slide kind, title, the block-stacked
 * body content, audio/video media slots, and display seconds.
 *
 * Block stack: the slide body is a list of typed `SlideBlock`s (heading /
 * body / bullet-list / image / callout). Each block lives in its own editor
 * file (`HeadingBlockEditor`, `BodyBlockEditor`, …) and the union dispatcher
 * lives in `BlockCard`. Reorder / remove sit in the BlockCard header.
 *
 * Legacy migration: when the server returns the pre-blocks `body` string and
 * no `blocks`, we surface it as a single BodyBlock so the editor renders
 * consistently. The first commit replaces both fields with the canonical
 * block list.
 */

import { Container } from "@components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { SettingsCard } from "../_shared";

import { MediaSlots } from "./MediaSlots";

const SlideContent = () => {
  return (
    <Container name='SlideEditor'>
      <SlideContentWrapper>
        <SettingsCard title='Slide'>
          <div> TO be implemented</div>{" "}
        </SettingsCard>
        <SettingsCard title='Media'>
          <MediaSlots />
        </SettingsCard>
      </SlideContentWrapper>
    </Container>
  );
};

export { SlideContent };
