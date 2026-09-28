import { FULL_TURN, lerp } from '@core/math';

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Grain extends Point {
  radius: number;
  outline: readonly Point[];
  shade: number;
}

export interface Bubble extends Point {
  radius: number;
}

export interface PlateFabric {
  length: number;
  thickness: number;
  tilt: number;
}

export interface Plate extends Point {
  length: number;
  thickness: number;
  cornerRadius: number;
  shade: number;
}

export interface PlateBed {
  tilt: number;
  plates: readonly Plate[];
}

interface PlateRow {
  y: number;
  thickness: number;
  reach: number;
  jointCover: number;
}

const HEX_ROW_SHARE = Math.sqrt(3) / 2;
const SAND = {
  across: 8,
  jitterShare: 0.12,
  sizeSpread: 0.22,
  relaxPasses: 12,
  tuckMinShare: 0.24,
  sampleStep: 3,
} as const;
const OUTLINE = { corners: 10, minReach: 0.9, cornerJitter: 0.35, stepsPerCorner: 5 } as const;
const PLATES = {
  lengthSpread: 0.6,
  thicknessSpread: 0.25,
  staggerJitter: 0.3,
  rowPorosityShare: 0.4,
  jointSkew: 2,
  cornerShare: 0.25,
} as const;
const BUBBLE = { minRadius: 2.5, maxRadius: 6, clearance: 1.5 } as const;
const COVER_STEP = 2;
const FIT_PASSES = 3;
const UINT32_RANGE = 2 ** 32;
const MULBERRY = { increment: 0x6d2b79f5, shiftA: 15, shiftB: 7, shiftC: 14, mixB: 61 } as const;

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY.increment) >>> 0;
    let value = Math.imul(state ^ (state >>> MULBERRY.shiftA), state | 1);
    value ^= value + Math.imul(value ^ (value >>> MULBERRY.shiftB), value | MULBERRY.mixB);
    return ((value ^ (value >>> MULBERRY.shiftC)) >>> 0) / UINT32_RANGE;
  };
}

function spread(random: () => number, share: number): number {
  return 1 + (random() - 0.5) * 2 * share;
}

function quadraticPoint(from: Point, control: Point, to: Point, t: number): Point {
  const a = (1 - t) ** 2;
  const b = 2 * (1 - t) * t;
  const c = t ** 2;
  return { x: a * from.x + b * control.x + c * to.x, y: a * from.y + b * control.y + c * to.y };
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function grainOutline(random: () => number): Point[] {
  const turn = random() * FULL_TURN;
  const step = FULL_TURN / OUTLINE.corners;
  const corners = Array.from({ length: OUTLINE.corners }, (_, index) => {
    const angle = turn + step * (index + (random() - 0.5) * OUTLINE.cornerJitter);
    const reach = lerp(OUTLINE.minReach, 1, random());
    return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach };
  });
  const curve = corners.flatMap((corner, index) => {
    const from = midpoint(corners.at(index - 1) ?? corner, corner);
    const to = midpoint(corner, corners[(index + 1) % corners.length]);
    return Array.from({ length: OUTLINE.stepsPerCorner }, (_, step) =>
      quadraticPoint(from, corner, to, step / OUTLINE.stepsPerCorner),
    );
  });
  const farthest = Math.max(...curve.map((point) => Math.hypot(point.x, point.y)));
  return curve.map((point) => ({ x: point.x / farthest, y: point.y / farthest }));
}

function makeGrain(x: number, y: number, radius: number, random: () => number): Grain {
  return { x, y, radius, outline: grainOutline(random), shade: random() };
}

function latticeGrains(size: Size, base: number, random: () => number): Grain[] {
  const spacing = base * 2;
  const rowStep = spacing * HEX_ROW_SHARE;
  const grains: Grain[] = [];
  for (let row = -1; row * rowStep < size.height + rowStep; row++) {
    const shift = (row & 1) * base;
    for (let x = -spacing + shift; x < size.width + spacing; x += spacing) {
      const jitterX = (random() - 0.5) * 2 * SAND.jitterShare * spacing;
      const jitterY = (random() - 0.5) * 2 * SAND.jitterShare * rowStep;
      const radius = base * spread(random, SAND.sizeSpread);
      grains.push(makeGrain(x + jitterX, row * rowStep + jitterY, radius, random));
    }
  }
  return grains;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function relax(grains: Grain[]): void {
  for (let pass = 0; pass < SAND.relaxPasses; pass++) {
    for (let i = 0; i < grains.length; i++) {
      for (let j = i + 1; j < grains.length; j++) pushApart(grains[i], grains[j]);
    }
  }
}

function pushApart(a: Grain, b: Grain): void {
  const gap = distance(a, b);
  const overlap = a.radius + b.radius - gap;
  if (overlap <= 0 || gap === 0) return;
  const push = overlap / 2 / gap;
  const dx = (b.x - a.x) * push;
  const dy = (b.y - a.y) * push;
  a.x -= dx;
  a.y -= dy;
  b.x += dx;
  b.y += dy;
}

function separate(grains: Grain[]): void {
  for (let i = 0; i < grains.length; i++) {
    for (let j = i + 1; j < grains.length; j++) {
      const reach = grains[i].radius + grains[j].radius;
      const gap = distance(grains[i], grains[j]);
      if (gap >= reach) continue;
      const shrink = gap / reach;
      grains[i].radius *= shrink;
      grains[j].radius *= shrink;
    }
  }
}

function growIntoSlack(grains: Grain[]): void {
  grains.forEach((grain) => {
    const room = Math.min(
      ...grains
        .filter((other) => other !== grain)
        .map((other) => distance(grain, other) - other.radius),
    );
    grain.radius = Math.max(grain.radius, room);
  });
}

function samplePoints(size: Size, step: number): Point[] {
  const points: Point[] = [];
  for (let y = step / 2; y < size.height; y += step) {
    for (let x = step / 2; x < size.width; x += step) points.push({ x, y });
  }
  return points;
}

function clearanceAt(point: Point, grains: readonly Grain[]): number {
  return Math.min(...grains.map((grain) => distance(point, grain) - grain.radius));
}

function tuckSmallGrains(grains: Grain[], size: Size, minRadius: number, random: () => number) {
  const points = samplePoints(size, SAND.sampleStep);
  const clearance = points.map((point) => clearanceAt(point, grains));
  for (;;) {
    const widest = widestIndex(clearance);
    const radius = clearance[widest];
    if (radius < minRadius) return;
    const grain = makeGrain(points[widest].x, points[widest].y, radius, random);
    grains.push(grain);
    points.forEach((point, index) => {
      clearance[index] = Math.min(clearance[index], distance(point, grain) - radius);
    });
  }
}

function insideOutline(outline: readonly Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i];
    const b = outline[j];
    const crosses = a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function isInsideGrain(grain: Grain, point: Point): boolean {
  const dx = point.x - grain.x;
  const dy = point.y - grain.y;
  if (dx * dx + dy * dy > grain.radius * grain.radius) return false;
  return insideOutline(grain.outline, dx / grain.radius, dy / grain.radius);
}

function coveredShare(size: Size, covers: (point: Point) => boolean): number {
  const points = samplePoints(size, COVER_STEP);
  return points.filter(covers).length / points.length;
}

export function sandCover(grains: readonly Grain[], size: Size): number {
  return coveredShare(size, (point) => grains.some((grain) => isInsideGrain(grain, point)));
}

function fitPorosity(grains: Grain[], size: Size, porosity: number): Grain[] {
  let fitted = grains;
  for (let pass = 0; pass < FIT_PASSES; pass++) {
    const scale = Math.sqrt((1 - porosity) / sandCover(fitted, size));
    if (scale >= 1) break;
    fitted = fitted.map((grain) => ({ ...grain, radius: grain.radius * scale }));
  }
  return fitted;
}

export function packSand(size: Size, porosity: number, seed: number): Grain[] {
  const random = seededRandom(seed);
  const base = size.width / SAND.across / 2;
  const grains = latticeGrains(size, base, random);
  relax(grains);
  separate(grains);
  growIntoSlack(grains);
  tuckSmallGrains(grains, size, base * SAND.tuckMinShare, random);
  return fitPorosity(grains, size, porosity);
}

function widestIndex(values: readonly number[]): number {
  let widest = 0;
  values.forEach((value, index) => {
    if (value > values[widest]) widest = index;
  });
  return widest;
}

export function placeBubbles(grains: readonly Grain[], size: Size, count: number): Bubble[] {
  const points = samplePoints(size, SAND.sampleStep);
  const room = points.map((point) => clearanceAt(point, grains) - BUBBLE.clearance);
  const bubbles: Bubble[] = [];
  while (bubbles.length < count) {
    const index = widestIndex(room);
    const radius = Math.min(room[index], BUBBLE.maxRadius);
    if (radius < BUBBLE.minRadius) break;
    const bubble = { ...points[index], radius };
    bubbles.push(bubble);
    points.forEach((point, other) => {
      room[other] = Math.min(room[other], distance(point, bubble) - radius - BUBBLE.clearance);
    });
  }
  return bubbles;
}

function rowCovers(porosity: number): { row: number; joint: number } {
  const cover = 1 - porosity;
  const row = cover ** PLATES.rowPorosityShare;
  return { row, joint: cover / row };
}

function skewedGap(meanGap: number, random: () => number): number {
  return meanGap * (PLATES.jointSkew + 1) * random() ** PLATES.jointSkew;
}

function plateRow(row: PlateRow, fabric: PlateFabric, random: () => number): Plate[] {
  const cornerRadius = row.thickness * PLATES.cornerShare;
  const cornerLoss = ((4 - Math.PI) * cornerRadius ** 2) / row.thickness;
  const jointGap = (fabric.length - cornerLoss) / row.jointCover - fabric.length;
  const plates: Plate[] = [];
  let x = -row.reach - random() * fabric.length * (1 + PLATES.staggerJitter);
  while (x < row.reach) {
    const length = fabric.length * spread(random, PLATES.lengthSpread / 2);
    const { y, thickness } = row;
    plates.push({ x: x + length / 2, y, length, thickness, cornerRadius, shade: random() });
    x += length + skewedGap(jointGap, random);
  }
  return plates;
}

export function layPlates(
  size: Size,
  fabric: PlateFabric,
  porosity: number,
  seed: number,
): PlateBed {
  const random = seededRandom(seed);
  const covers = rowCovers(porosity);
  const reach = Math.hypot(size.width, size.height) / 2;
  const plates: Plate[] = [];
  for (let top = -reach; top < reach;) {
    const thickness = fabric.thickness * spread(random, PLATES.thicknessSpread);
    const row = { y: top + thickness / 2, thickness, reach, jointCover: covers.joint };
    plates.push(...plateRow(row, fabric, random));
    top += thickness / covers.row;
  }
  return { tilt: fabric.tilt, plates };
}

function insidePlate(plate: Plate, point: Point): boolean {
  const { cornerRadius } = plate;
  const qx = Math.abs(point.x - plate.x) - (plate.length / 2 - cornerRadius);
  const qy = Math.abs(point.y - plate.y) - (plate.thickness / 2 - cornerRadius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) <= cornerRadius;
}

function toBedPoint(bed: PlateBed, size: Size, point: Point): Point {
  const x = point.x - size.width / 2;
  const y = point.y - size.height / 2;
  const cos = Math.cos(-bed.tilt);
  const sin = Math.sin(-bed.tilt);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export function plateCover(bed: PlateBed, size: Size): number {
  return coveredShare(size, (point) => {
    const local = toBedPoint(bed, size, point);
    return bed.plates.some((plate) => insidePlate(plate, local));
  });
}
