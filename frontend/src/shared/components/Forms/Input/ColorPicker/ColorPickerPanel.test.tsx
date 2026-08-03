// Interaction tests for the panel's commit semantics: swatch picks commit
// immediately, the custom view commits only on Apply, and Cancel discards —
// including standalone (no onClose), where it must reset and navigate back
// rather than silently do nothing. The var(--role-*) resolve-via-::after
// fallback in loadSwatch isn't covered here: jsdom's getComputedStyle doesn't
// resolve pseudo-element styles, so that path needs a real browser.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorPickerPanel } from "./ColorPickerPanel";
import type { ColorValue } from "./colorConversion";

const SWATCHES: ColorValue[] = ["#3182ce", "#e53e3e", "oklch(0.65 0.18 260)"];

describe("ColorPickerPanel", () => {
  describe("swatch view", () => {
    it("commits a swatch pick verbatim and closes", async () => {
      const onChange = vi.fn();
      const onClose = vi.fn();
      render(
        <ColorPickerPanel colorSwatch={SWATCHES} onChange={onChange} onClose={onClose} />,
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Set color oklch(0.65 0.18 260)" }),
      );
      expect(onChange).toHaveBeenCalledWith("oklch(0.65 0.18 260)");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("marks the current value's swatch as pressed", () => {
      render(
        <ColorPickerPanel value='#e53e3e' colorSwatch={SWATCHES} onChange={vi.fn()} />,
      );
      expect(
        screen.getByRole("button", { name: "Set color #e53e3e" }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("clears via the slash swatch when onClear is provided", async () => {
      const onClear = vi.fn();
      const onClose = vi.fn();
      render(
        <ColorPickerPanel
          colorSwatch={SWATCHES}
          onChange={vi.fn()}
          onClear={onClear}
          onClose={onClose}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Clear color" }));
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("opens the custom view from the rainbow tile", async () => {
      render(<ColorPickerPanel colorSwatch={SWATCHES} onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: "Custom color" }));
      expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    });
  });

  describe("custom view", () => {
    it("commits the edited hex only on Apply, then closes", async () => {
      const onChange = vi.fn();
      const onClose = vi.fn();
      render(
        <ColorPickerPanel
          value='#3182ce'
          colorSwatch={SWATCHES}
          initialView='custom'
          onChange={onChange}
          onClose={onClose}
        />,
      );
      const hexInput = screen.getByRole("textbox", { name: "Hex color" });
      await userEvent.clear(hexInput);
      await userEvent.type(hexInput, "#00ff00");
      expect(onChange).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("button", { name: "Apply" }));
      expect(onChange).toHaveBeenCalledWith("#00ff00");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes without committing on Cancel when the popover owns it", async () => {
      const onChange = vi.fn();
      const onClose = vi.fn();
      render(
        <ColorPickerPanel
          value='#3182ce'
          colorSwatch={SWATCHES}
          initialView='custom'
          onChange={onChange}
          onClose={onClose}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onChange).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("standalone Cancel discards edits and returns to the swatch grid", async () => {
      const onChange = vi.fn();
      render(
        <ColorPickerPanel value='#3182ce' colorSwatch={SWATCHES} onChange={onChange} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Custom color" }));
      const hexInput = screen.getByRole("textbox", { name: "Hex color" });
      await userEvent.clear(hexInput);
      await userEvent.type(hexInput, "#00ff00");
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      // Back on the grid, nothing committed.
      expect(onChange).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: "Set color #3182ce" }),
      ).toBeInTheDocument();
      // Re-entering the custom view shows the seed again, not the discarded edit.
      await userEvent.click(screen.getByRole("button", { name: "Custom color" }));
      expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#3182ce");
    });

    it("standalone Cancel with no swatch view resets the editor to the seed", async () => {
      render(
        <ColorPickerPanel
          value='#3182ce'
          colorSwatch={SWATCHES}
          initialView='custom'
          onChange={vi.fn()}
        />,
      );
      const hexInput = screen.getByRole("textbox", { name: "Hex color" });
      await userEvent.clear(hexInput);
      await userEvent.type(hexInput, "#00ff00");
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#3182ce");
    });

    it("loads a concrete Recent swatch into the editor without committing", async () => {
      const onChange = vi.fn();
      render(
        <ColorPickerPanel
          value='#3182ce'
          colorSwatch={SWATCHES}
          recentlyUsedColorSwatch={["#123456"]}
          initialView='custom'
          onChange={onChange}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Set color #123456" }));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#123456");
    });

    it("hands the back control to the host via onBack when opened on custom", async () => {
      const onBack = vi.fn();
      render(
        <ColorPickerPanel
          colorSwatch={SWATCHES}
          initialView='custom'
          onBack={onBack}
          onChange={vi.fn()}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Custom color" }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("returns to the swatch grid via the back button", async () => {
      render(<ColorPickerPanel colorSwatch={SWATCHES} onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: "Custom color" }));
      await userEvent.click(screen.getByRole("button", { name: /Custom color/ }));
      expect(
        screen.getByRole("button", { name: "Set color #3182ce" }),
      ).toBeInTheDocument();
    });

    it("offers the opacity slider and keeps alpha by default", () => {
      render(
        <ColorPickerPanel
          value='#3182ce80'
          colorSwatch={SWATCHES}
          initialView='custom'
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByRole("slider", { name: "Opacity" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#3182ce80");
    });
  });

  // An opaque-only host (the slide background is validated to #rrggbb) must
  // never receive an #rrggbbaa value, whatever route the color arrives by —
  // otherwise the commit is rejected and the picker silently does nothing.
  describe("custom view with allowAlpha={false}", () => {
    const renderOpaque = (props: Partial<Parameters<typeof ColorPickerPanel>[0]> = {}) => {
      const onChange = vi.fn();
      render(
        <ColorPickerPanel
          value='#3182ce80'
          colorSwatch={SWATCHES}
          initialView='custom'
          allowAlpha={false}
          onChange={onChange}
          {...props}
        />,
      );
      return onChange;
    };

    it("hides the opacity slider", () => {
      renderOpaque();
      expect(screen.queryByRole("slider", { name: "Opacity" })).not.toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Hue" })).toBeInTheDocument();
    });

    it("drops alpha from a translucent seed and commits six-digit hex", async () => {
      const onChange = renderOpaque();
      expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#3182ce");
      await userEvent.click(screen.getByRole("button", { name: "Apply" }));
      expect(onChange).toHaveBeenCalledWith("#3182ce");
    });

    it("drops alpha from a typed eight-digit hex", async () => {
      const onChange = renderOpaque();
      const hexInput = screen.getByRole("textbox", { name: "Hex color" });
      await userEvent.clear(hexInput);
      await userEvent.type(hexInput, "#11223344");
      await userEvent.click(screen.getByRole("button", { name: "Apply" }));
      expect(onChange).toHaveBeenCalledWith("#112233");
    });

    it("drops alpha from a translucent Recent swatch", async () => {
      renderOpaque({ recentlyUsedColorSwatch: ["#12345680"] });
      await userEvent.click(screen.getByRole("button", { name: "Set color #12345680" }));
      expect(screen.getByRole("textbox", { name: "Hex color" })).toHaveValue("#123456");
    });
  });
});
