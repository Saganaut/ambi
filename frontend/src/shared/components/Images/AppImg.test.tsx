// AppImg swaps to the DS placeholder panel on load error or missing src, and
// retries the real image when a fresh src arrives (presigned URL refresh).
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppImg } from "./AppImg";

const REAL_SRC = "https://s3.example/photo.webp";

describe("AppImg", () => {
  it("renders the source image when it loads", () => {
    render(<AppImg src={REAL_SRC} alt='A photo' />);
    const img = screen.getByRole("img", { name: "A photo" });
    expect(img).toHaveAttribute("src", REAL_SRC);
    expect(img).not.toHaveAttribute("data-image-fallback");
  });

  it("swaps to the placeholder panel on load error", () => {
    render(<AppImg src={REAL_SRC} alt='A photo' fallbackSeed='opt-1' />);
    fireEvent.error(screen.getByRole("img"));
    const fallback = screen.getByRole("img", { name: "A photo (image unavailable)" });
    expect(fallback.getAttribute("src")).toMatch(/^data:image\/svg\+xml,/);
    expect(fallback).toHaveAttribute("data-image-fallback");
  });

  it("keeps a decorative image decorative when it fails", () => {
    const { container } = render(<AppImg src={REAL_SRC} alt='' />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("retries the real image when the src changes after an error", () => {
    const { rerender } = render(<AppImg src={REAL_SRC} alt='A photo' />);
    fireEvent.error(screen.getByRole("img"));
    const refreshed = `${REAL_SRC}?sig=fresh`;
    rerender(<AppImg src={refreshed} alt='A photo' />);
    expect(screen.getByRole("img", { name: "A photo" })).toHaveAttribute("src", refreshed);
  });

  it("renders the placeholder immediately when src is missing", () => {
    render(<AppImg src={undefined} alt='' fallbackSeed='opt-2' />);
    const { container } = render(<AppImg src={null} alt='' fallbackSeed='opt-3' />);
    expect(container.querySelector("img")).toHaveAttribute("data-image-fallback");
  });

  it("passes through presentation props", () => {
    const { container } = render(
      <AppImg src={REAL_SRC} alt='' className='thumb' draggable={false} />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toHaveClass("thumb");
    expect(img).toHaveAttribute("draggable", "false");
  });
});
