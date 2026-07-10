import figma from "@figma/code-connect";

import { Btn } from "@ui/Buttons/Btn";

/**
 * Code Connect mapping — Figma "Button" variant set ↔ the code `Btn`.
 *
 * The Figma set exposes Variant × Fill (+ a Label text prop). Fill values map
 * 1:1 to `BtnFill`; the Figma set covers six of the eight `BtnVariant` values
 * (secondary/disabled aren't drawn as variants there). `size`/`shape` default.
 *
 * Publishing this mapping requires a Figma Organization/Enterprise plan with the
 * component published to a team library — see z-docs/features/code-connect.md.
 */
figma.connect(
  Btn,
  "https://www.figma.com/design/gWOvYXLf21iAzGDcNHsY2U/Untitled?node-id=142-505",
  {
    props: {
      label: figma.string("Label"),
      variant: figma.enum("Variant", {
        primary: "primary",
        brand: "brand",
        info: "info",
        success: "success",
        warning: "warning",
        error: "error",
      }),
      fill: figma.enum("Fill", {
        default: "default",
        bordered: "bordered",
        ghost: "ghost",
      }),
    },
    example: ({ label, variant, fill }) => (
      <Btn variant={variant} fill={fill}>
        {label}
      </Btn>
    ),
  },
);
