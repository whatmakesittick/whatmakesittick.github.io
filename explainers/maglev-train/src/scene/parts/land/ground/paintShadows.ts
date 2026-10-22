import { BEAM_M, GIRDER, GUIDEWAY_TOP, PIER } from '../../../../model';
import { SHADOW_PAINT } from '../palette';
import { prismShadow, shadowBand } from '../shadow';
import type { GroundPoint } from '../shadow';
import { drawSmooth, fillBox, tracePolygon, wrapShifts } from './painter';
import type { Painter } from './painter';

const TRACE_STEP = 1.5;
const UNSHADED = '#ffffff';

export function guidewayShadowBand(): [number, number] {
  const half = GIRDER.topWidth / 2;
  return shadowBand([-half, half], [GIRDER.bottom, GUIDEWAY_TOP]);
}

export function pierShadow(x: number): GroundPoint[] {
  const halfWidth = PIER.width / 2;
  const halfDepth = PIER.depth / 2;
  return prismShadow({
    x: [x - halfWidth, x + halfWidth],
    y: [0, PIER.height],
    z: [-halfDepth, halfDepth],
  });
}

function pierShadows(painter: Painter): void {
  const { context } = painter;
  const count = Math.round(painter.period / BEAM_M);
  context.fillStyle = SHADOW_PAINT.tint;
  for (let index = 0; index < count; index += 1) {
    const outline = pierShadow(index * BEAM_M);
    const xs = outline.map(([x]) => x);
    wrapShifts(painter, [Math.min(...xs), Math.max(...xs)]).forEach((shift) => {
      tracePolygon(painter, outline, shift, TRACE_STEP);
      context.fill();
    });
  }
}

function paintMask(painter: Painter, context: CanvasRenderingContext2D): void {
  const small: Painter = {
    ...painter,
    context,
    width: SHADOW_PAINT.maskSize,
    height: SHADOW_PAINT.maskSize,
  };
  context.fillStyle = UNSHADED;
  context.fillRect(0, 0, small.width, small.height);
  fillBox(small, [0, painter.period], guidewayShadowBand(), SHADOW_PAINT.tint);
  pierShadows(small);
}

export function paintLineShade(painter: Painter): void {
  const { context } = painter;
  context.fillStyle = UNSHADED;
  context.fillRect(0, 0, painter.width, painter.height);
  drawSmooth(
    painter,
    [SHADOW_PAINT.maskSize, SHADOW_PAINT.maskSize],
    (mask) => paintMask(painter, mask),
    { globalAlpha: SHADOW_PAINT.strength },
  );
}
