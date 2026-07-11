// Toolbar row for DrawingCanvas: tool pickers, palette swatches, brush
// sizes, and undo/redo/clear. Purely presentational — all state lives in
// useDrawingCanvas.
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import CircleOutlineIcon from "@assets/icons/content/circle-outline.svg?react";
import EraserIcon from "@assets/icons/content/eraser.svg?react";
import LineDiagonalIcon from "@assets/icons/content/line-diagonal.svg?react";
import SquareOutlineIcon from "@assets/icons/content/square-outline.svg?react";
import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
import type { BrushSize, DrawingToolId } from "./useDrawingCanvas";
import { BRUSH_SIZES } from "./useDrawingCanvas";
import styles from "./DrawingCanvas.module.css";

interface ToolOption {
  id: DrawingToolId;
  label: string;
  icon: React.ReactNode;
}

const SHAPE_TOOLS: ToolOption[] = [
  { id: "line", label: "Line", icon: <LineDiagonalIcon aria-hidden='true' /> },
  { id: "rect", label: "Rectangle", icon: <SquareOutlineIcon aria-hidden='true' /> },
  { id: "ellipse", label: "Ellipse", icon: <CircleOutlineIcon aria-hidden='true' /> },
];

interface DrawingToolbarProps {
  allowEraser: boolean;
  allowShapes: boolean;
  palette: readonly string[];
  tool: DrawingToolId;
  onToolChange: (tool: DrawingToolId) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  brushSizeId: BrushSize["id"];
  onBrushSizeChange: (id: BrushSize["id"]) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const DrawingToolbar = ({
  allowEraser,
  allowShapes,
  palette,
  tool,
  onToolChange,
  activeColor,
  onColorChange,
  brushSizeId,
  onBrushSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
}: DrawingToolbarProps) => {
  const toolOptions: ToolOption[] = [
    { id: "pen", label: "Pen", icon: <PencilIcon aria-hidden='true' /> },
    ...(allowEraser
      ? [{ id: "eraser" as const, label: "Eraser", icon: <EraserIcon aria-hidden='true' /> }]
      : []),
    ...(allowShapes ? SHAPE_TOOLS : []),
  ];

  return (
    <div className={styles.toolbar} role='toolbar' aria-label='Drawing tools'>
      <div className={styles.toolGroup}>
        {toolOptions.map((option) => (
          <IconBtn
            key={option.id}
            fill={tool === option.id ? "default" : "ghost"}
            variant='primary'
            size='sm'
            icon={option.icon}
            aria-label={option.label}
            aria-pressed={tool === option.id}
            title={option.label}
            onClick={() => {
              onToolChange(option.id);
            }}
          />
        ))}
      </div>

      {palette.length > 0 && (
        <div className={styles.toolGroup} role='group' aria-label='Stroke color'>
          {palette.map((color) => (
            <button
              key={color}
              type='button'
              className={[
                styles.swatch,
                color === activeColor && styles.swatchActive,
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--swatch-color": color } as React.CSSProperties}
              aria-label={`Draw with ${color}`}
              aria-pressed={color === activeColor}
              title={color}
              onClick={() => {
                onColorChange(color);
              }}
            />
          ))}
        </div>
      )}

      <div className={styles.toolGroup} role='group' aria-label='Brush size'>
        {BRUSH_SIZES.map((size) => (
          <button
            key={size.id}
            type='button'
            className={[
              styles.brushBtn,
              size.id === brushSizeId && styles.brushActive,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={`${size.id} brush`}
            aria-pressed={size.id === brushSizeId}
            title={`${size.id} brush`}
            onClick={() => {
              onBrushSizeChange(size.id);
            }}>
            <span
              className={styles.brushDot}
              style={{ "--brush-dot-size": `${String(Math.max(4, size.size / 2))}px` } as React.CSSProperties}
              aria-hidden='true'
            />
          </button>
        ))}
      </div>

      <div className={styles.toolGroup}>
        <IconBtn
          fill='ghost'
          variant='primary'
          size='sm'
          icon={<ArrowUturnLeftIcon aria-hidden='true' />}
          aria-label='Undo'
          title='Undo'
          disabled={!canUndo}
          onClick={onUndo}
        />
        <IconBtn
          fill='ghost'
          variant='primary'
          size='sm'
          icon={<ArrowUturnRightIcon aria-hidden='true' />}
          aria-label='Redo'
          title='Redo'
          disabled={!canRedo}
          onClick={onRedo}
        />
        <IconBtn
          fill='ghost'
          variant='error'
          size='sm'
          icon={<TrashIcon aria-hidden='true' />}
          aria-label='Clear drawing'
          title='Clear drawing'
          onClick={onClear}
        />
      </div>
    </div>
  );
};

export { DrawingToolbar };
