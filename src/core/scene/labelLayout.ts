export type LabelSide = 'left' | 'right';

export const TEXT_OFFSET_PX = 28;
export const TEXT_RISE_PX = 18;
const LABEL_GAP_PX = 4;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LabelBox {
  id: string;
  anchor: Point;
  width: number;
  height: number;
  preferred: LabelSide;
  rank?: number;
}

export interface LabelBounds {
  width: number;
  height: number;
  bottomInset: number;
  keepOut?: readonly Rect[];
}

export interface Placement {
  side: LabelSide;
  shift: number;
  hidden?: true;
}

function opposite(side: LabelSide): LabelSide {
  return side === 'left' ? 'right' : 'left';
}

function fitsSide(box: LabelBox, side: LabelSide, bounds: LabelBounds): boolean {
  const reach = box.width + TEXT_OFFSET_PX;
  return side === 'left' ? box.anchor.x - reach >= 0 : box.anchor.x + reach <= bounds.width;
}

function sideOrder(box: LabelBox, bounds: LabelBounds): LabelSide[] {
  const { preferred } = box;
  const other = opposite(preferred);
  const fitting = [preferred, other].filter((side) => fitsSide(box, side, bounds));
  return fitting.length > 0 ? fitting : [preferred];
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

function byRankThenAnchor(a: LabelBox, b: LabelBox): number {
  const rank = (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY);
  return (Number.isNaN(rank) ? 0 : rank) || a.anchor.y - b.anchor.y || a.anchor.x - b.anchor.x;
}

function candidateShifts(natural: Rect, obstacles: readonly Rect[]): number[] {
  const shifts = obstacles.flatMap((other) => [
    other.bottom + LABEL_GAP_PX - natural.top,
    other.top - LABEL_GAP_PX - natural.bottom,
  ]);
  return [0, ...shifts].sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
}

function freeShift(
  box: LabelBox,
  side: LabelSide,
  obstacles: readonly Rect[],
  floor: number,
): number | undefined {
  const natural = pillRect(box, side, 0);
  const nearby = obstacles.filter(
    (other) =>
      natural.left < other.right + LABEL_GAP_PX && other.left < natural.right + LABEL_GAP_PX,
  );
  return candidateShifts(natural, nearby).find((shift) => {
    const rect = pillRect(box, side, Math.round(shift));
    return rect.top >= 0 && rect.bottom <= floor && !nearby.some((other) => collides(rect, other));
  });
}

interface Spot {
  side: LabelSide;
  shift: number | undefined;
}

function nearestSpot(box: LabelBox, spots: readonly Spot[]): Placement | undefined {
  const free = spots.flatMap(({ side, shift }) => (shift === undefined ? [] : [{ side, shift }]));
  const [own, other] = free;
  if (!own || !other) return own;
  return Math.abs(other.shift) + box.height < Math.abs(own.shift) ? other : own;
}

export function layoutLabels(
  boxes: readonly LabelBox[],
  bounds: LabelBounds,
): Map<string, Placement> {
  const placements = new Map<string, Placement>();
  const obstacles: Rect[] = [...(bounds.keepOut ?? [])];
  const floor = bounds.height - bounds.bottomInset;
  for (const box of [...boxes].sort(byRankThenAnchor)) {
    const sides = sideOrder(box, bounds);
    const spot = nearestSpot(
      box,
      sides.map((side) => ({ side, shift: freeShift(box, side, obstacles, floor) })),
    );
    if (!spot) {
      placements.set(box.id, { side: sides[0], shift: 0, hidden: true });
      continue;
    }
    const shift = Math.round(spot.shift);
    obstacles.push(pillRect(box, spot.side, shift));
    placements.set(box.id, { side: spot.side, shift });
  }
  return placements;
}
