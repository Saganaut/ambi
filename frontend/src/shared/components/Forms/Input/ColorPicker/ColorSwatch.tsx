import { hsvaToHex, getContrastingColor } from "@uiw/color-convert";
import Swatch from "@uiw/react-color-swatch";
import type { HexColor } from "@uiw/color-convert";
import { COLOR_CHOICES, toHexColor } from "@utils/color";

const ColorPoint = (props: { color: string; checked?: boolean }) => {
  if (!props.checked) return null;
  return (
    <div
      style={{
        height: 5,
        width: 5,
        borderRadius: "50%",
        backgroundColor: getContrastingColor(props.color),
      }}
    />
  );
};

interface ColorSwatchProps {
  color: HexColor;
  onChange: (color: HexColor) => void;
  colorChoices?: HexColor[];
}

const ColorSwatch = ({ color, onChange, colorChoices }: ColorSwatchProps) => {
  const handleChange = (color: HexColor) => {
    onChange(color);
  };

  const colors = colorChoices ?? COLOR_CHOICES;
  return (
    <Swatch
      colors={colors}
      color={color}
      rectProps={{
        children: <ColorPoint color={color} />,
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      }}
      onChange={(hsvColor) => {
        handleChange(toHexColor(hsvaToHex(hsvColor)));
      }}
    />
  );
};

export { ColorSwatch, ColorPoint };
