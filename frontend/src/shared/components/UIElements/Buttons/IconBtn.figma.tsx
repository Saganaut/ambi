import figma from "@figma/code-connect";

import { IconBtn } from "@ui/Buttons/IconBtn";

/**
 * Code Connect mapping — Figma "IconButton" variant set ↔ the code `IconBtn`.
 *
 * The Figma set exposes Variant × Shape. Shape `square` maps to the default
 * shape and `round` to `round`. The icon is passed as a `ReactNode`; the Figma
 * placeholder glyph maps to a neutral element here — swap it for the real icon
 * at the call site. `fill`/`size` default.
 *
 * Publishing requires a Figma Organization/Enterprise plan with the component
 * published to a team library — see z-docs/features/code-connect.md.
 */
figma.connect(
  IconBtn,
  "https://www.figma.com/design/gWOvYXLf21iAzGDcNHsY2U/Untitled?node-id=147-517",
  {
    props: {
      variant: figma.enum("Variant", {
        primary: "primary",
        brand: "brand",
        error: "error",
      }),
      shape: figma.enum("Shape", {
        square: "default",
        round: "round",
      }),
    },
    example: ({ variant, shape }) => (
      <IconBtn
        variant={variant}
        shape={shape}
        aria-label="Action"
        icon={<span>+</span>}
      />
    ),
  },
);
