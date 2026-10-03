import { clamp } from '@core/math';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type TextAlign = 'left' | 'right' | 'center';

export interface Anchor {
  x: number;
  baseline: number;
  align: TextAlign;
}

export interface Placed extends Anchor {
  box: Box;
}

export interface TextMetrics {
  font: number;
  ascent: number;
  descent: number;
}

export function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function isInside(box: Box, bounds: Box): boolean {
  return box.top >= bounds.top && box.bottom <= bounds.bottom;
}

function alignOffset(width: number, align: TextAlign): number {
  return { left: 0, center: width / 2, right: width }[align];
}

export function textBox(width: number, anchor: Anchor, metrics: TextMetrics): Box {
  const left = anchor.x - alignOffset(width, anchor.align);
  return {
    left,
    right: left + width,
    top: anchor.baseline - metrics.font * metrics.ascent,
    bottom: anchor.baseline + metrics.font * metrics.descent,
  };
}

export function shiftInto(box: Box, anchor: Anchor, bounds: Box): Placed {
  const shift = clamp(0, bounds.left - box.left, bounds.right - box.right);
  return {
    ...anchor,
    x: anchor.x + shift,
    box: { ...box, left: box.left + shift, right: box.right + shift },
  };
}

export function placeText(
  width: number,
  candidates: readonly Anchor[],
  taken: Box[],
  bounds: Box,
  metrics: TextMetrics,
): Placed {
  const placed = candidates.map((anchor) =>
    shiftInto(textBox(width, anchor, metrics), anchor, bounds),
  );
  const free = placed.find(
    (spot) => isInside(spot.box, bounds) && !taken.some((box) => intersects(box, spot.box)),
  );
  const chosen = free ?? placed[0];
  taken.push(chosen.box);
  return chosen;
}

export function segmentBoxes(
  from: number,
  to: number,
  step: number,
  yAt: (x: number) => number,
  slack: number,
): Box[] {
  const boxes: Box[] = [];
  for (let left = from; left < to; left += step) {
    const right = Math.min(left + step, to);
    const top = Math.min(yAt(left), yAt(right));
    const bottom = Math.max(yAt(left), yAt(right));
    boxes.push({ left, right, top: top - slack, bottom: bottom + slack });
  }
  return boxes;
}
