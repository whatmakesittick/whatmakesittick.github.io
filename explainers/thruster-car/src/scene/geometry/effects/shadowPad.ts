import { CanvasTexture } from 'three';
import { FULL_TURN } from '@core/math';

type Pair = readonly [number, number];

export interface ShadowPadLayout {
  size: Pair;
  pad: Pair;
  padCorner: number;
  padBlur: number;
  padAlpha: number;
  spots: readonly Pair[];
  spot: Pair;
  spotAlpha: number;
}

const PIXELS_PER_METRE = 48;
const SPOT_SHOULDER = { offset: 0.45, share: 0.65 } as const;
const INK = '#000000';

function shade(alpha: number): string {
  return `rgba(0,0,0,${alpha})`;
}

function paintPad(context: CanvasRenderingContext2D, layout: ShadowPadLayout): void {
  const { width, height } = context.canvas;
  const padWidth = layout.pad[0] * PIXELS_PER_METRE;
  const padHeight = layout.pad[1] * PIXELS_PER_METRE;
  context.save();
  context.shadowColor = shade(layout.padAlpha);
  context.shadowBlur = layout.padBlur * PIXELS_PER_METRE;
  context.shadowOffsetX = width;
  context.fillStyle = INK;
  context.beginPath();
  context.roundRect(
    (width - padWidth) / 2 - width,
    (height - padHeight) / 2,
    padWidth,
    padHeight,
    layout.padCorner * PIXELS_PER_METRE,
  );
  context.fill();
  context.restore();
}

function paintSpot(context: CanvasRenderingContext2D, layout: ShadowPadLayout, at: Pair): void {
  const { width, height } = context.canvas;
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, shade(layout.spotAlpha));
  gradient.addColorStop(SPOT_SHOULDER.offset, shade(layout.spotAlpha * SPOT_SHOULDER.share));
  gradient.addColorStop(1, shade(0));
  context.save();
  context.translate(width / 2 + at[0] * PIXELS_PER_METRE, height / 2 + at[1] * PIXELS_PER_METRE);
  context.scale(layout.spot[0] * PIXELS_PER_METRE, layout.spot[1] * PIXELS_PER_METRE);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 1, 0, FULL_TURN);
  context.fill();
  context.restore();
}

export function shadowPadTexture(layout: ShadowPadLayout): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.size[0] * PIXELS_PER_METRE);
  canvas.height = Math.round(layout.size[1] * PIXELS_PER_METRE);
  const context = canvas.getContext('2d');
  if (context) {
    paintPad(context, layout);
    layout.spots.forEach((at) => paintSpot(context, layout, at));
  }
  return new CanvasTexture(canvas);
}
