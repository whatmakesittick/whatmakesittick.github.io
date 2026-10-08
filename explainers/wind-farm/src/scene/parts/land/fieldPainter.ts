import { Color } from 'three';
import type { GroundPoint } from '../../../model/layout';
import { canopyPattern } from './canopyPattern';
import { GROUND_TEXTURE } from './constants';
import { FIELD_KINDS, GROUND_PAINT } from './fieldConstants';
import type { Stripes } from './fieldConstants';
import type { Field, FieldLayout, FieldLook } from './fieldPlan';
import { cssColour, shaded, traceLine, tracePolygon } from './groundCanvas';
import type { Painter } from './groundCanvas';
import { centroid, extents } from './polygon';

const HALF = 0.5;

function alongPoint(angle: number, along: number, across: number): GroundPoint {
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  return [along * cos - across * sin, along * sin + across * cos];
}

function fieldFill(painter: Painter, field: Field, base: Color): CanvasGradient {
  const { along, across } = extents(field.corners, field.angle);
  const middle = (along[0] + along[1]) / 2;
  const [from, to] = [across[0], across[1]].map((offset) =>
    painter.projection.pixel(...alongPoint(field.angle, middle, offset)),
  );
  const gradient = painter.context.createLinearGradient(...from, ...to);
  const spread = GROUND_PAINT.acrossShade * HALF;
  gradient.addColorStop(0, cssColour(shaded(base, 1 + spread)));
  gradient.addColorStop(1, cssColour(shaded(base, 1 - spread)));
  return gradient;
}

function paintStripes(painter: Painter, field: Field, base: Color, stripes: Stripes): void {
  const { context, projection } = painter;
  const [cx, cz] = centroid(field.corners);
  const scale = projection.scale(cx, cz);
  if (stripes.spacing * scale < GROUND_TEXTURE.minStripePx) return;
  const { along, across } = extents(field.corners, field.angle);
  context.save();
  tracePolygon(painter, field.corners);
  context.clip();
  context.beginPath();
  for (
    let offset = across[0] + stripes.spacing * HALF;
    offset < across[1];
    offset += stripes.spacing
  )
    traceLine(painter, [
      alongPoint(field.angle, along[0], offset),
      alongPoint(field.angle, along[1], offset),
    ]);
  context.globalAlpha = stripes.alpha;
  context.lineWidth = stripes.width * scale;
  context.strokeStyle = cssColour(shaded(base, stripes.shade));
  context.stroke();
  context.restore();
}

const MEAN = new Color(GROUND_PAINT.mean);

function fieldBase(field: Field, look: FieldLook): Color {
  const tone = 1 + (field.tone - HALF) * look.toneSpread;
  const [colour, muting] = field.wood
    ? [GROUND_PAINT.canopy, look.woodMuting]
    : [FIELD_KINDS[field.kind].colour, look.muting];
  return new Color(colour).lerp(MEAN, muting).multiplyScalar(tone);
}

function fillField(painter: Painter, field: Field, look: FieldLook): void {
  tracePolygon(painter, field.corners);
  painter.context.fillStyle = fieldFill(painter, field, fieldBase(field, look));
  painter.context.fill();
}

function paintWood(painter: Painter, field: Field, canopy: CanvasPattern | null): void {
  const { context } = painter;
  tracePolygon(painter, field.corners);
  if (canopy) {
    context.fillStyle = canopy;
    context.fill();
  }
  const [cx, cz] = centroid(field.corners);
  context.lineWidth = GROUND_PAINT.canopyEdgeWidth * painter.projection.scale(cx, cz);
  context.strokeStyle = GROUND_PAINT.canopyEdge;
  context.stroke();
}

function detailField(
  painter: Painter,
  field: Field,
  look: FieldLook,
  canopy: CanvasPattern | null,
): void {
  const { stripes } = FIELD_KINDS[field.kind];
  if (field.wood) paintWood(painter, field, canopy);
  else if (stripes) paintStripes(painter, field, fieldBase(field, look), stripes);
}

export function paintFieldFills(painter: Painter, { fields, look }: FieldLayout): void {
  const { context, projection } = painter;
  context.fillStyle = GROUND_PAINT.base;
  context.fillRect(0, 0, projection.size, projection.size);
  fields.forEach((field) => fillField(painter, field, look));
}

export function paintFieldDetails(painter: Painter, { fields, look }: FieldLayout): void {
  const canopy = canopyPattern(painter.context);
  fields.forEach((field) => detailField(painter, field, look, canopy));
}

export function paintFields(painter: Painter, layout: FieldLayout): void {
  paintFieldFills(painter, layout);
  paintFieldDetails(painter, layout);
}
