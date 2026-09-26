export type LabelSide = 'left' | 'right';

export const TEXT_OFFSET_PX = 28;
export const TEXT_RISE_PX = 18;
const LABEL_GAP_PX = 4;

export interface Point {
  x: number;
  y: number;
}

export interface LabelBox {
  id: string;
  anchor: Point;
  width: number;
  height: number;
  preferred: LabelSide;
}

export interface LabelBounds {
  width: number;
  height: number;
  bottomInset: number;
}

export interface Placement {
  side: LabelSide;
  shift: number;
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function opposite(side: LabelSide): LabelSide {
  return side === 'left' ? 'right' : 'left';
}

function chooseSide(box: LabelBox, bounds: LabelBounds): LabelSide {
  const reach = box.width + TEXT_OFFSET_PX;
  const fits: Record<LabelSide, boolean> = {
    left: box.anchor.x - reach >= 0,
    right: box.anchor.x + reach <= bounds.width,
  };
  const { preferred } = box;
  return fits[preferred] || !fits[opposite(preferred)] ? preferred : opposite(preferred);
}

function pillRect(box: LabelBox, side: LabelSide, shift: number): Rect {
  const left =
    side === 'right' ? box.anchor.x + TEXT_OFFSET_PX : box.anchor.x - TEXT_OFFSET_PX - box.width;
  const centre = box.anchor.y - TEXT_RISE_PX + shift;
  return {
    left,
    right: left + box.width,
    top: centre - box.height / 2,
    bottom: centre + box.height / 2,
  };
}

function collides(a: Rect, b: Rect): boolean {
  return (
    a.left < b.right + LABEL_GAP_PX &&
    b.left < a.right + LABEL_GAP_PX &&
    a.top < b.bottom + LABEL_GAP_PX &&
    b.top < a.bottom + LABEL_GAP_PX
  );
}

function byAnchor(a: LabelBox, b: LabelBox): number {
  return a.anchor.y - b.anchor.y || a.anchor.x - b.anchor.x;
}

function settle(box: LabelBox, side: LabelSide, placed: Rect[], floor: number): number {
  const natural = pillRect(box, side, 0);
  let shift = 0;
  for (let attempt = 0; attempt <= placed.length * 2; attempt += 1) {
    const rect = pillRect(box, side, shift);
    const blocker = placed.find((other) => collides(rect, other));
    if (!blocker) break;
    const below = blocker.bottom + LABEL_GAP_PX - natural.top;
    const above = blocker.top - LABEL_GAP_PX - natural.bottom;
    shift = natural.bottom + below <= floor ? below : above;
  }
  return Math.round(shift);
}

export function layoutLabels(
  boxes: readonly LabelBox[],
  bounds: LabelBounds,
): Map<string, Placement> {
  const placements = new Map<string, Placement>();
  const placed: Rect[] = [];
  const floor = bounds.height - bounds.bottomInset;
  for (const box of [...boxes].sort(byAnchor)) {
    const side = chooseSide(box, bounds);
    const shift = settle(box, side, placed, floor);
    placed.push(pillRect(box, side, shift));
    placements.set(box.id, { side, shift });
  }
  return placements;
}
