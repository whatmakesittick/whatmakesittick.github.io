import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
} from 'three';
import { clamp, lerp, toRadians } from '@core/math';
import { SEAT } from '../../../model/layout';
import { orientedBox, placed, signedArea } from './cabinFrame';
import type { Basis } from './cabinFrame';
import { smoothCurve } from './curve';
import type { Vec2 } from './curve';
import { add, cross, dot, MeshBuilder, normalize, scale, sub } from './mesh';
import type { Vec3 } from './mesh';

export type SeatFinish = 'shell' | 'cushion' | 'harness' | 'buckle';

export type SeatGeometry = Readonly<Record<SeatFinish, BufferGeometry[]>>;

interface PathFrame {
  centre: Vec2;
  tangent: Vec2;
  normal: Vec2;
  reach: number;
}

interface SectionLoop {
  points: Vec2[];
  regions: SeatFinish[];
}

const SEAT_Z = SEAT[2];
const HIP_SETBACK = 0.09;
const HIP_Y = 0.11;

const PATH = {
  hip: [SEAT[0] - HIP_SETBACK, HIP_Y] as Vec2,
  cushionLength: 0.46,
  cushionRise: 0.06,
  backLength: 0.8,
  recline: toRadians(20),
  bendRadius: 0.1,
  stations: 30,
} as const;

const HALF_WIDTH = smoothCurve([
  [-0.49, 0.232],
  [-0.25, 0.248],
  [0, 0.255],
  [0.3, 0.25],
  [0.5, 0.258],
  [0.6, 0.235],
  [0.68, 0.165],
  [0.8, 0.155],
]);

const BOLSTER = smoothCurve([
  [-0.49, 0.03],
  [-0.3, 0.065],
  [0, 0.1],
  [0.16, 0.12],
  [0.36, 0.085],
  [0.52, 0.06],
  [0.64, 0.045],
  [0.74, 0.07],
  [0.8, 0.06],
]);

const SHELL_DEPTH = smoothCurve([
  [-0.49, 0.045],
  [0, 0.055],
  [0.8, 0.06],
]);

const CHAIKIN = 0.25;

const PROFILE = {
  wall: 0.045,
  stripe: 0.045,
  dish: 0.012,
  tipRise: 0.012,
  tipInset: 0.35,
  backCorner: 0.035,
} as const;

const HARNESS = {
  width: 0.046,
  thickness: 0.004,
  lift: 0.004,
  steps: 18,
  slot: { reach: 0.56, offset: 0.085, drape: 0.018, size: [0.016, 0.01, 0.06] as Vec3 },
  buckle: { reach: -0.22, radius: 0.034, height: 0.01, segments: 20 },
  converge: 0.026,
  lap: { reach: -0.03, offset: 0.15, drape: 0.008 },
  crotch: { reach: -0.4 },
  adjuster: { reach: 0.24, size: [0.03, 0.012, 0.056] as Vec3 },
} as const;

function cushionFront(): Vec2 {
  return [PATH.hip[0] + PATH.cushionLength, PATH.hip[1] + PATH.cushionRise];
}

function turnOf(from: Vec2, to: Vec2): number {
  return from[0] * to[1] - from[1] * to[0];
}

function seatPath(): { length: number; at: (distance: number) => PathFrame } {
  const front = cushionFront();
  const hip = PATH.hip;
  const toHip = Math.hypot(hip[0] - front[0], hip[1] - front[1]);
  const first: Vec2 = [(hip[0] - front[0]) / toHip, (hip[1] - front[1]) / toHip];
  const second: Vec2 = [-Math.sin(PATH.recline), Math.cos(PATH.recline)];
  const angle = Math.acos(clamp(first[0] * second[0] + first[1] * second[1], -1, 1));
  const sign = Math.sign(turnOf(first, second));
  const radius = PATH.bendRadius;
  const tangentLength = radius * Math.tan(angle / 2);
  const start: Vec2 = [hip[0] - first[0] * tangentLength, hip[1] - first[1] * tangentLength];
  const side: Vec2 = sign < 0 ? [first[1], -first[0]] : [-first[1], first[0]];
  const pivot: Vec2 = [start[0] + side[0] * radius, start[1] + side[1] * radius];
  const startAngle = Math.atan2(start[1] - pivot[1], start[0] - pivot[0]);
  const flat = toHip - tangentLength;
  const arc = radius * angle;
  const length = flat + arc + PATH.backLength - tangentLength;
  const frame = (centre: Vec2, tangent: Vec2, distance: number): PathFrame => ({
    centre,
    tangent,
    normal: [tangent[1], -tangent[0]],
    reach: distance - flat - arc / 2,
  });
  const at = (distance: number): PathFrame => {
    if (distance <= flat) {
      return frame(
        [front[0] + first[0] * distance, front[1] + first[1] * distance],
        first,
        distance,
      );
    }
    if (distance <= flat + arc) {
      const turn = startAngle + sign * angle * ((distance - flat) / arc);
      const centre: Vec2 = [pivot[0] + radius * Math.cos(turn), pivot[1] + radius * Math.sin(turn)];
      return frame(centre, [-sign * Math.sin(turn), sign * Math.cos(turn)], distance);
    }
    const rest = distance - flat - arc + tangentLength;
    return frame([hip[0] + second[0] * rest, hip[1] + second[1] * rest], second, distance);
  };
  return { length, at };
}

function profileHalf(reach: number): Vec2[] {
  const half = HALF_WIDTH(reach);
  const bolster = BOLSTER(reach);
  const depth = SHELL_DEPTH(reach);
  const { wall, stripe, dish, tipRise, tipInset, backCorner } = PROFILE;
  const inner = half - wall;
  return [
    [stripe, 0],
    [Math.max(stripe * 2, inner - bolster / 2), dish],
    [inner, bolster],
    [half - wall * tipInset, bolster + tipRise],
    [half, bolster - tipRise],
    [half, -depth / 2],
    [half - backCorner, -depth],
  ];
}

const STRIPE_FINISH: SeatFinish = 'shell';

const HALF_REGIONS: readonly SeatFinish[] = [
  'cushion',
  'cushion',
  'cushion',
  'shell',
  'shell',
  'shell',
  'shell',
];

function baseLoop(reach: number): SectionLoop {
  const right = profileHalf(reach);
  const left = right.map(([a, b]): Vec2 => [-a, b]).reverse();
  const points = [...right, ...left];
  const regions = [...HALF_REGIONS, ...[...HALF_REGIONS].reverse().slice(1), STRIPE_FINISH];
  if (signedArea(points) <= 0) return { points, regions };
  const count = points.length;
  return {
    points: [...points].reverse(),
    regions: [...regions.slice(0, count - 1).reverse(), regions[count - 1]],
  };
}

function cornerRegion(before: SeatFinish, after: SeatFinish, stripe: boolean): SeatFinish {
  if (before === after) return before;
  return stripe ? 'cushion' : 'shell';
}

function smoothLoop({ points, regions }: SectionLoop): SectionLoop {
  const count = points.length;
  const smooth: Vec2[] = [];
  const finishes: SeatFinish[] = [];
  points.forEach((point, index) => {
    const next = (index + 1) % count;
    smooth.push(
      lerpPoint(point, points[next], CHAIKIN),
      lerpPoint(point, points[next], 1 - CHAIKIN),
    );
    const touchesStripe = index === count - 1 || next === count - 1;
    finishes.push(regions[index], cornerRegion(regions[index], regions[next], touchesStripe));
  });
  return { points: smooth, regions: finishes };
}

function lerpPoint(from: Vec2, to: Vec2, share: number): Vec2 {
  return [lerp(from[0], to[0], share), lerp(from[1], to[1], share)];
}

function seatLoop(reach: number): SectionLoop {
  return smoothLoop(baseLoop(reach));
}

function seatPoint(frame: PathFrame, [a, b]: Vec2): Vec3 {
  return [frame.centre[0] + frame.normal[0] * b, frame.centre[1] + frame.normal[1] * b, SEAT_Z + a];
}

function seatFrames(path: SeatPath): PathFrame[] {
  return Array.from({ length: PATH.stations }, (_, index) =>
    path.at((path.length * index) / (PATH.stations - 1)),
  );
}

type SeatPath = ReturnType<typeof seatPath>;

interface SeatGrid {
  path: SeatPath;
  frames: PathFrame[];
  points: Vec3[][];
  normals: Vec3[][];
  regions: SeatFinish[];
}

function gridNormals(points: Vec3[][]): Vec3[][] {
  const rows = points[0].length;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points.flat(2), 3));
  const indices: number[] = [];
  for (let k = 0; k < points.length - 1; k += 1) {
    for (let j = 0; j < rows; j += 1) {
      const next = (j + 1) % rows;
      const [a, b, c, d] = [
        k * rows + j,
        (k + 1) * rows + j,
        (k + 1) * rows + next,
        k * rows + next,
      ];
      indices.push(a, b, c, a, c, d);
    }
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal');
  const result = points.map((column, k) =>
    column.map((_, j): Vec3 => {
      const index = k * rows + j;
      return [normal.getX(index), normal.getY(index), normal.getZ(index)];
    }),
  );
  geometry.dispose();
  return result;
}

function seatGrid(): SeatGrid {
  const path = seatPath();
  const frames = seatFrames(path);
  const loops = frames.map((frame) => seatLoop(frame.reach));
  const points = frames.map((frame, k) => loops[k].points.map((point) => seatPoint(frame, point)));
  return { path, frames, points, normals: gridNormals(points), regions: loops[0].regions };
}

function emitSides(grid: SeatGrid, builders: Map<SeatFinish, MeshBuilder>): void {
  const { points, normals, regions } = grid;
  const rows = points[0].length;
  for (let k = 0; k < points.length - 1; k += 1) {
    for (let j = 0; j < rows; j += 1) {
      const builder = builderOf(builders, regions[j]);
      const next = (j + 1) % rows;
      const corners = [
        [k, j],
        [k + 1, j],
        [k + 1, next],
        [k, next],
      ] as const;
      const [a, b, c, d] = corners.map(([ck, cj]) =>
        builder.vertex(points[ck][cj], normals[ck][cj], ck * rows + cj),
      );
      builder.quad(a, b, c, d);
    }
  }
}

function emitCap(grid: SeatGrid, builder: MeshBuilder, index: number, outward: Vec3): void {
  const frame = grid.frames[index];
  const loop = seatLoop(frame.reach).points;
  const triangles = ShapeUtils.triangulateShape(
    loop.map(([a, b]) => new Vector2(a, b)),
    [],
  );
  const vertices = loop.map((point) => builder.vertex(seatPoint(frame, point), outward));
  const corners = loop.map((point) => seatPoint(frame, point));
  triangles.forEach(([a, b, c]) => {
    const facing = dot(cross(sub(corners[b], corners[a]), sub(corners[c], corners[a])), outward);
    if (facing >= 0) builder.triangle(vertices[a], vertices[b], vertices[c]);
    else builder.triangle(vertices[a], vertices[c], vertices[b]);
  });
}

function tangent3(frame: PathFrame, sign: number): Vec3 {
  return [frame.tangent[0] * sign, frame.tangent[1] * sign, 0];
}

function builderOf(builders: Map<SeatFinish, MeshBuilder>, finish: SeatFinish): MeshBuilder {
  let builder = builders.get(finish);
  if (!builder) {
    builder = new MeshBuilder();
    builders.set(finish, builder);
  }
  return builder;
}

function seatBody(grid: SeatGrid): Map<SeatFinish, BufferGeometry> {
  const builders = new Map<SeatFinish, MeshBuilder>();
  emitSides(grid, builders);
  const last = grid.frames.length - 1;
  const shell = builderOf(builders, 'shell');
  emitCap(grid, shell, 0, tangent3(grid.frames[0], -1));
  emitCap(grid, shell, last, tangent3(grid.frames[last], 1));
  return new Map([...builders].map(([finish, builder]) => [finish, builder.build()]));
}

function frameAt({ path }: SeatGrid, reach: number): PathFrame {
  return path.at(clamp(reach - path.at(0).reach, 0, path.length));
}

function surfaceLift(reach: number, across: number): number {
  const [stripe, foot] = profileHalf(reach);
  const share = clamp((Math.abs(across) - stripe[0]) / (foot[0] - stripe[0]), 0, 1);
  return foot[1] * share;
}

function onSeat(grid: SeatGrid, reach: number, across: number, lift: number): Vec3 {
  return seatPoint(frameAt(grid, reach), [across, surfaceLift(reach, across) + lift]);
}

function seatNormal(grid: SeatGrid, reach: number): Vec3 {
  const { normal } = frameAt(grid, reach);
  return [normal[0], normal[1], 0];
}

interface StrapRun {
  from: Vec2;
  to: Vec2;
  drape: number;
}

interface StrapSample {
  point: Vec3;
  normal: Vec3;
  side: Vec3;
}

function strapSamples(grid: SeatGrid, { from, to, drape }: StrapRun): StrapSample[] {
  const points = Array.from({ length: HARNESS.steps + 1 }, (_, step) => {
    const t = step / HARNESS.steps;
    const reach = lerp(from[0], to[0], t);
    const lift = HARNESS.lift + drape * Math.sin(Math.PI * t);
    return {
      point: onSeat(grid, reach, lerp(from[1], to[1], t), lift),
      normal: seatNormal(grid, reach),
    };
  });
  return points.map(({ point, normal }, index) => {
    const ahead = points[Math.min(points.length - 1, index + 1)].point;
    const behind = points[Math.max(0, index - 1)].point;
    const side = normalize(cross(normal, sub(ahead, behind)));
    return { point, normal, side };
  });
}

function strap(grid: SeatGrid, run: StrapRun): BufferGeometry {
  const builder = new MeshBuilder();
  const half = HARNESS.width / 2;
  const faces = strapSamples(grid, run).map(({ point, normal, side }) => {
    const top = add(point, scale(normal, HARNESS.thickness));
    const [left, right] = [scale(side, half), scale(side, -half)];
    return {
      top: [builder.vertex(add(top, left), normal), builder.vertex(add(top, right), normal)],
      left: [builder.vertex(add(top, left), side), builder.vertex(add(point, left), side)],
      right: [
        builder.vertex(add(point, right), scale(side, -1)),
        builder.vertex(add(top, right), scale(side, -1)),
      ],
    };
  });
  faces.slice(0, -1).forEach((face, index) => {
    const next = faces[index + 1];
    (['top', 'left', 'right'] as const).forEach((key) => {
      const [a, b] = face[key];
      const [c, d] = next[key];
      builder.quad(a, b, d, c);
    });
  });
  return builder.build();
}

function harnessStraps(grid: SeatGrid): BufferGeometry[] {
  const { slot, buckle, converge, lap, crotch } = HARNESS;
  const runs: StrapRun[] = [-1, 1].flatMap((sign) => [
    {
      from: [slot.reach, sign * slot.offset],
      to: [buckle.reach, sign * converge],
      drape: slot.drape,
    },
    { from: [lap.reach, sign * lap.offset], to: [buckle.reach, sign * converge], drape: lap.drape },
  ]);
  runs.push({ from: [crotch.reach, 0], to: [buckle.reach, 0], drape: 0 });
  return runs.map((run) => strap(grid, run));
}

function seatBasis(grid: SeatGrid, reach: number): Basis {
  const frame = frameAt(grid, reach);
  return [
    [frame.tangent[0], frame.tangent[1], 0],
    [frame.normal[0], frame.normal[1], 0],
    [0, 0, 1],
  ];
}

function buckleParts(grid: SeatGrid): BufferGeometry[] {
  const { buckle, adjuster } = HARNESS;
  const disc = new CylinderGeometry(buckle.radius, buckle.radius, buckle.height, buckle.segments);
  const centre = onSeat(grid, buckle.reach, 0, HARNESS.lift + buckle.height / 2);
  const adjusters = [-1, 1].map((sign) =>
    orientedBox(
      onSeat(grid, adjuster.reach, sign * adjusterOffset(), HARNESS.lift),
      seatBasis(grid, adjuster.reach),
      adjuster.size,
    ),
  );
  return [placed(disc, centre, seatBasis(grid, buckle.reach)), ...adjusters];
}

function adjusterOffset(): number {
  const { slot, buckle, adjuster, converge } = HARNESS;
  const share = (slot.reach - adjuster.reach) / (slot.reach - buckle.reach);
  return lerp(slot.offset, converge, share);
}

function slotRims(grid: SeatGrid): BufferGeometry[] {
  const { slot } = HARNESS;
  return [-1, 1].map((sign) =>
    orientedBox(
      onSeat(grid, slot.reach, sign * slot.offset, 0),
      seatBasis(grid, slot.reach),
      slot.size,
    ),
  );
}

export function buildSeat(): SeatGeometry {
  const grid = seatGrid();
  const body = seatBody(grid);
  const pick = (finish: SeatFinish) => {
    const geometry = body.get(finish);
    return geometry ? [geometry] : [];
  };
  return {
    shell: [...pick('shell'), ...slotRims(grid)],
    cushion: pick('cushion'),
    harness: [...pick('harness'), ...harnessStraps(grid)],
    buckle: buckleParts(grid),
  };
}
