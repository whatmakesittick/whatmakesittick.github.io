import { Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CUT_X } from '../../../model';
import type { PartContext } from '../context';
import { boxOver } from '../line/geometry';
import { BODY, CABIN, INTERIOR } from './constants';
import { aheadShape, cabinHalfWidth, cabinOutline, capGeometry } from './cabin';
import { TRAIN_FINISHES, trainMesh } from './finishes';
import { MeshBuilder, normalize } from './mesh';
import { mergeAll } from './mirror';
import type { Vec3 } from './nose';

type Range = readonly [number, number];

const BACK_X = CUT_X - CABIN.depth;
const FLOOR_EPSILON = 1e-6;
const ROUND_SEGMENTS = 2;
const SEAT_FILL = 0.92;
const SIDES = [1, -1] as const;
const UP: Vec3 = [0, 1, 0];

function isFloor(point: Vector2): boolean {
  return Math.abs(point.y - CABIN.floorY) < FLOOR_EPSILON;
}

function shellGeometries(): [lining: BufferGeometry, carpet: BufferGeometry] {
  const outline = cabinOutline();
  const lining = new MeshBuilder();
  const carpet = new MeshBuilder();
  const edges = outline.map((a, index) => [a, outline[(index + 1) % outline.length]] as const);
  edges.forEach(([a, b]) => {
    const floor = isFloor(a) && isFloor(b);
    const edge = new Vector2().subVectors(b, a);
    const builder = floor ? carpet : lining;
    const normal = floor ? UP : normalize([0, edge.x, -edge.y]);
    const corner = (x: number, point: Vector2) => builder.vertex([x, point.y, point.x], normal);
    const ids = [corner(BACK_X, a), corner(CUT_X, a), corner(CUT_X, b), corner(BACK_X, b)];
    builder.triangle(ids[0], ids[3], ids[2]);
    builder.triangle(ids[0], ids[2], ids[1]);
  });
  const back = capGeometry([aheadShape(outline)], BACK_X);
  return [mergeAll([lining.build(), back]), carpet.build()];
}

function rounded(
  width: number,
  height: number,
  depth: number,
  centre: Vec3,
  lean = 0,
): BufferGeometry {
  const geometry = new RoundedBoxGeometry(depth, height, width, ROUND_SEGMENTS, INTERIOR.radius);
  geometry.rotateZ(lean);
  return geometry.translate(...centre);
}

function seatCentres(): Vec3[] {
  const offsets = Array.from(
    { length: CABIN.seatsPerSide },
    (_, seat) => CABIN.aisle / 2 + (seat + 0.5) * CABIN.seatWidth,
  );
  return Array.from(
    { length: CABIN.seatRows },
    (_, row) => CUT_X - INTERIOR.frontGap - row * CABIN.seatPitch,
  ).flatMap((x) =>
    SIDES.flatMap((side) => offsets.map((offset): Vec3 => [x, INTERIOR.seatY, side * offset])),
  );
}

function seats(): [fabric: BufferGeometry, frames: BufferGeometry] {
  const width = CABIN.seatWidth * SEAT_FILL;
  const { cushion, back, pedestal } = INTERIOR;
  const centres = seatCentres();
  const fabric = centres.flatMap(([x, y, z]) => [
    rounded(width, cushion.height, cushion.depth, [x, y, z]),
    rounded(
      width,
      back.height,
      back.depth,
      [x - cushion.depth / 2, y + back.height / 2, z],
      back.lean,
    ),
  ]);
  const frames = centres.map(([x, y, z]) =>
    boxOver(
      [x - pedestal / 2, x + pedestal / 2],
      [CABIN.floorY, y - cushion.height / 2],
      [z - pedestal, z + pedestal],
    ),
  );
  return [mergeAll(fabric), mergeAll(frames)];
}

function centred(size: number): Range {
  return [-size / 2, size / 2];
}

function lengthwise(y: Range, z: Range): BufferGeometry {
  return boxOver([BACK_X, CUT_X], y, z);
}

function sideWalls(y: Range, inner: number, outer: number): BufferGeometry {
  return mergeAll(SIDES.map((side) => lengthwise(y, side > 0 ? [inner, outer] : [-outer, -inner])));
}

function fittings(): [racks: BufferGeometry, glass: BufferGeometry, lamp: BufferGeometry] {
  const { rackY, windowInset, windowMargin, lightThickness } = INTERIOR;
  const rackWall = cabinHalfWidth(rackY);
  const racks = sideWalls(
    [rackY, rackY + INTERIOR.rackThickness],
    rackWall - INTERIOR.rackDepth,
    rackWall,
  );
  const windowY: Range = [BODY.bandBottom + windowMargin, BODY.bandTop - windowMargin];
  const wall = Math.min(...windowY.map(cabinHalfWidth)) - windowInset;
  const door = boxOver(
    [BACK_X, BACK_X + windowInset],
    [CABIN.floorY, CABIN.floorY + INTERIOR.doorHeight],
    centred(INTERIOR.doorWidth),
  );
  const ceiling = BODY.roofY - CABIN.wall;
  const lamp = lengthwise(
    [ceiling - lightThickness * 2, ceiling - lightThickness],
    centred(INTERIOR.lightWidth),
  );
  return [racks, mergeAll([sideWalls(windowY, wall - windowInset, wall), door]), lamp];
}

export function buildInterior(context: PartContext, parent: Object3D): void {
  const [lining, carpet] = shellGeometries();
  const [fabric, frames] = seats();
  const [racks, glass, lamp] = fittings();
  const parts = [
    [lining, TRAIN_FINISHES.lining],
    [carpet, TRAIN_FINISHES.carpet],
    [fabric, TRAIN_FINISHES.seat],
    [frames, TRAIN_FINISHES.seatFrame],
    [racks, TRAIN_FINISHES.seatFrame],
    [glass, TRAIN_FINISHES.pane],
    [lamp, TRAIN_FINISHES.lamp],
  ] as const;
  parts.forEach(([geometry, finish]) => parent.add(trainMesh(context, geometry, finish)));
}
