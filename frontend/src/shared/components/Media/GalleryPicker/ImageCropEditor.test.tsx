// Pins the crop box's aspect resolution: a numeric caller aspect is passed to
// react-easy-crop as-is, while `aspect="source"` starts square (nothing is
// known before the media loads) and re-fits to the image's own natural ratio
// once `onMediaLoaded` reports it. react-easy-crop itself can't load media in
// jsdom, so the Cropper is stubbed and the reported MediaSize driven by hand.
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";
import type { MediaSize } from "react-easy-crop";

import { ImageCropEditor } from "./ImageCropEditor";

// Capture the aspect handed to react-easy-crop and expose onMediaLoaded so a
// test can simulate the media load.
let lastAspect: number | undefined;
let fireMediaLoaded: ((mediaSize: MediaSize) => void) | undefined;

vi.mock("react-easy-crop", () => ({
  default: (props: { aspect: number; onMediaLoaded?: (mediaSize: MediaSize) => void }) => {
    lastAspect = props.aspect;
    fireMediaLoaded = props.onMediaLoaded;
    return <div data-testid="cropper-stub" />;
  },
}));

const mediaSize = (naturalWidth: number, naturalHeight: number): MediaSize => ({
  width: naturalWidth / 2,
  height: naturalHeight / 2,
  naturalWidth,
  naturalHeight,
});

const renderEditor = (aspect: number | "source") =>
  render(
    <ImageCropEditor
      imageSrc="blob:test"
      aspect={aspect}
      isSaving={false}
      onCancel={() => undefined}
      onConfirm={() => undefined}
    />,
  );

afterEach(() => {
  cleanup();
  lastAspect = undefined;
  fireMediaLoaded = undefined;
});

describe("ImageCropEditor aspect resolution", () => {
  it("passes a numeric caller aspect straight through, ignoring media loads", () => {
    renderEditor(16 / 9);
    expect(screen.getByTestId("cropper-stub")).toBeDefined();
    expect(lastAspect).toBeCloseTo(16 / 9);

    act(() => fireMediaLoaded?.(mediaSize(800, 500)));
    expect(lastAspect).toBeCloseTo(16 / 9);
  });

  it('resolves "source" to the image\'s own ratio once the media loads', () => {
    renderEditor("source");
    // Square until the natural size is known.
    expect(lastAspect).toBe(1);

    act(() => fireMediaLoaded?.(mediaSize(800, 500)));
    expect(lastAspect).toBeCloseTo(1.6);
  });

  it('keeps the square fallback when the media reports a zero height', () => {
    renderEditor("source");
    act(() => fireMediaLoaded?.(mediaSize(800, 0)));
    expect(lastAspect).toBe(1);
  });
});
