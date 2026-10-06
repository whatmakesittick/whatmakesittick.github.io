import { t } from '@core/i18n';
import { CanvasSurface, canvasFont } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { watchShallowLocalized } from '@core/ui/subscribe';
import type { FieldId, WeightingId } from '../ids';
import { MODEL_SIZE, kspaceDisplay, pictureFor } from '../model';
import type { MriScannerStore, MriScannerStoreState } from '../state';
import { THEME } from '../theme';

export type PictureInputs = readonly [field: FieldId, weighting: WeightingId, linesFilled: number];

const PIXELS_PER_CELL = 4;
const CANVAS_SIZE = MODEL_SIZE * PIXELS_PER_CELL;
const FULL_LEVEL = 255;
const EMPTY_FONT_PX = 13;
const EMPTY_PADDING_PX = 12;
const HALF = 0.5;
const BACKGROUND = THEME.screenFrame;

function selectInputs(state: MriScannerStoreState): PictureInputs {
  return [state.field, state.weighting, state.linesFilled];
}

function grey(level: number): string {
  const channel = Math.round(level * FULL_LEVEL);
  return `rgb(${channel} ${channel} ${channel})`;
}

export function paintGrid(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  values: Float32Array,
): void {
  const cell = frame.width / MODEL_SIZE;
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, frame.width, frame.height);
  values.forEach((level, index) => {
    if (level <= 0) return;
    context.fillStyle = grey(level);
    const row = Math.floor(index / MODEL_SIZE);
    const column = index % MODEL_SIZE;
    context.fillRect(column * cell, row * cell, Math.ceil(cell), Math.ceil(cell));
  });
}

export function paintEmpty(context: CanvasRenderingContext2D, frame: CanvasFrame): void {
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, frame.width, frame.height);
  context.fillStyle = THEME.rest;
  context.font = canvasFont(frame, EMPTY_FONT_PX);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const maxWidth = frame.width - 2 * EMPTY_PADDING_PX;
  context.fillText(t('chapters.picture.empty'), frame.width * HALF, frame.height * HALF, maxWidth);
}

function squareSurface(root: ParentNode, name: string): CanvasSurface {
  const canvas = requireElement<HTMLCanvasElement>(root, `[data-canvas="${name}"]`);
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  return new CanvasSurface(canvas);
}

export function mountKspaceView(root: ParentNode, store: MriScannerStore): Disposer {
  const kspace = squareSurface(root, 'kspace');
  const image = squareSurface(root, 'image');
  const stopWatching = watchShallowLocalized(store, selectInputs, ([field, weighting, lines]) => {
    kspace.paint((context, frame) =>
      paintGrid(context, frame, kspaceDisplay(field, weighting, lines)),
    );
    image.paint((context, frame) =>
      lines > 0
        ? paintGrid(context, frame, pictureFor(field, weighting, lines))
        : paintEmpty(context, frame),
    );
  });
  return () => {
    stopWatching();
    kspace.dispose();
    image.dispose();
  };
}
