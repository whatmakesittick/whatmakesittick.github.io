export type LabelSide = 'left' | 'right';

export const TEXT_OFFSET_PX = 28;
export const TEXT_RISE_PX = 18;
export const MAX_SHIFT_PX = 120;
const LABEL_GAP_PX = 4;
const SETTLE_GAP_PX = 16;

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

export type Placements = ReadonlyMap<string, Placement>;

interface Board {
  bounds: LabelBounds;
  obstacles: Rect[];
  floor: number;
}

interface Lane {
  box: LabelBox;
  side: LabelSide;
  natural: Rect;
  nearby: readonly Rect[];
  floor: number;
}

interface Spot {
  side: LabelSide;
  shift: number | undefined;
}

function opposite(side: LabelSide): LabelSide {
  return side === 'left' ? 'right' : 'left';
}

function fitsSide(box: LabelBox, side: LabelSide, bounds: LabelBounds): boolean {
  const reach = box.width + TEXT_OFFSET_PX;
  return side === 'left' ? box.anchor.x - reach >= 0 : box.anchor.x + reach <= bounds.width;
}

function sideOrder(box: LabelBox, bounds: LabelBounds, own: LabelSide): LabelSide[] {
  const fitting = [own, opposite(own)].filter((side) => fitsSide(box, side, bounds));
  return fitting.length > 0 ? fitting : [own];
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

function collides(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.left < b.right + gap &&
    b.left < a.right + gap &&
    a.top < b.bottom + gap &&
    b.top < a.bottom + gap
  );
}

function byRankThenAnchor(a: LabelBox, b: LabelBox): number {
  const rank = (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY);
  return (Number.isNaN(rank) ? 0 : rank) || a.anchor.y - b.anchor.y || a.anchor.x - b.anchor.x;
}

function lane(box: LabelBox, side: LabelSide, board: Board): Lane {
  const natural = pillRect(box, side, 0);
  const nearby = board.obstacles.filter(
    (other) =>
      natural.left < other.right + LABEL_GAP_PX && other.left < natural.right + LABEL_GAP_PX,
  );
  return { box, side, natural, nearby, floor: board.floor };
}

function isFree(place: Lane, shift: number, gap: number = LABEL_GAP_PX): boolean {
  if (Math.abs(shift) > MAX_SHIFT_PX) return false;
  const rect = pillRect(place.box, place.side, Math.round(shift));
  return (
    rect.top >= 0 &&
    rect.bottom <= place.floor &&
    !place.nearby.some((other) => collides(rect, other, gap))
  );
}

function candidateShifts(natural: Rect, obstacles: readonly Rect[]): number[] {
  const shifts = obstacles.flatMap((other) => [
    other.bottom + LABEL_GAP_PX - natural.top,
    other.top - LABEL_GAP_PX - natural.bottom,
  ]);
  return [0, ...shifts].sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
}

function nearestShift(place: Lane): number | undefined {
  return candidateShifts(place.natural, place.nearby).find((shift) => isFree(place, shift));
}

function nearestSpot(box: LabelBox, spots: readonly Spot[]): Placement | undefined {
  const free = spots.flatMap(({ side, shift }) => (shift === undefined ? [] : [{ side, shift }]));
  const [own, other] = free;
  if (!own || !other) return own;
  return Math.abs(other.shift) + box.height < Math.abs(own.shift) ? other : own;
}

function held(previous: Placement | undefined): Placement | undefined {
  return previous && !previous.hidden ? previous : undefined;
}

function home(box: LabelBox, board: Board): Placement | undefined {
  const side = box.preferred;
  if (!fitsSide(box, side, board.bounds)) return undefined;
  return isFree(lane(box, side, board), 0, SETTLE_GAP_PX) ? { side, shift: 0 } : undefined;
}

function hold(box: LabelBox, board: Board, last: Placement | undefined): Placement | undefined {
  if (!last || !fitsSide(box, last.side, board.bounds)) return undefined;
  return isFree(lane(box, last.side, board), last.shift)
    ? { side: last.side, shift: last.shift }
    : undefined;
}

function search(box: LabelBox, board: Board, own: LabelSide): Placement {
  const sides = sideOrder(box, board.bounds, own);
  const spot = nearestSpot(
    box,
    sides.map((side) => ({ side, shift: nearestShift(lane(box, side, board)) })),
  );
  return spot
    ? { side: spot.side, shift: Math.round(spot.shift) }
    : { side: sides[0], shift: 0, hidden: true };
}

export function layoutLabels(
  boxes: readonly LabelBox[],
  bounds: LabelBounds,
  previous: Placements = new Map(),
): Map<string, Placement> {
  const placements = new Map<string, Placement>();
  const board: Board = {
    bounds,
    obstacles: [...(bounds.keepOut ?? [])],
    floor: bounds.height - bounds.bottomInset,
  };
  for (const box of [...boxes].sort(byRankThenAnchor)) {
    const last = held(previous.get(box.id));
    const placement =
      home(box, board) ?? hold(box, board, last) ?? search(box, board, last?.side ?? box.preferred);
    if (!placement.hidden) board.obstacles.push(pillRect(box, placement.side, placement.shift));
    placements.set(box.id, placement);
  }
  return placements;
}
