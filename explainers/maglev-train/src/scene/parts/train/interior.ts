import { Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box } from '@core/scene/geometry/box';
import { CUT_X } from '../../../model';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { BODY, CABIN, INTERIOR } from './constants';
import { cabinHalfWidth, cabinOutline } from './cabin';
import { TRAIN_FINISHES } from './finishes';
import { cross, dot, MeshBuilder, normalize, sub } from './mesh';
import { mergeAll } from './mirror';
import type { Vec3 } from './nose';

const BACK_X = CUT_X - CABIN.depth;
const FLOOR_EPSILON = 1e-6;
const ROUND_SEGMENTS = 2;
const SIDES = [1, -1] as const;

function orientedQuad(builder: MeshBuilder, corners: readonly Vec3[], normal: Vec3): void {
  const ids = corners.map((corner) => builder.vertex(corner, normal));
  const facing = dot(cross(sub(corners[1], corners[0]), sub(corners[2], corners[0])), normal);
  const order = facing >= 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
  builder.triangle(ids[order[0]], ids[order[1]], ids[order[2]]);
  builder.triangle(ids[order[0]], ids[order[2]], ids[order[3]]);
}

function inwardNormal(a: Vector2, b: Vector2): Vec3 {
  const edge = new Vector2().subVectors(b, a);
  const middle = new Vector2().addVectors(a, b).multiplyScalar(0.5);
  const normal: Vec3 = normalize([0, edge.x, -edge.y]);
  return dot(normal, [0, -middle.y + (BODY.floorY + BODY.roofY) / 2, -middle.x]) >= 0
    ? normal
    : [0, -normal[1], -normal[2]];
}

function shellGeometries(): { lining: BufferGeometry; carpet: BufferGeometry } {
  const outline = cabinOutline();
  const lining = new MeshBuilder();
  const carpet = new MeshBuilder();
  outline.forEach((a, index) => {
    const b = outline[(index + 1) % outline.length];
    const floor =
      Math.abs(a.y - CABIN.floorY) < FLOOR_EPSILON && Math.abs(b.y - CABIN.floorY) < FLOOR_EPSILON;
    const corners: Vec3[] = [
      [BACK_X, a.y, a.x],
      [CUT_X, a.y, a.x],
      [CUT_X, b.y, b.x],
      [BACK_X, b.y, b.x],
    ];
    orientedQuad(floor ? carpet : lining, corners, floor ? [0, 1, 0] : inwardNormal(a, b));
  });
  const back = new MeshBuilder();
  const centre = outline
    .reduce((sum, point) => sum.add(point), new Vector2())
    .divideScalar(outline.length);
  const hub = back.vertex([BACK_X, centre.y, centre.x], [1, 0, 0]);
  outline.forEach((a, index) => {
    const b = outline[(index + 1) % outline.length];
    const ids = [a, b].map((point) => back.vertex([BACK_X, point.y, point.x], [1, 0, 0]));
    const facing = dot(
      cross(
        sub([BACK_X, a.y, a.x], [BACK_X, centre.y, centre.x]),
        sub([BACK_X, b.y, b.x], [BACK_X, centre.y, centre.x]),
      ),
      [1, 0, 0],
    );
    if (facing >= 0) back.triangle(hub, ids[0], ids[1]);
    else back.triangle(hub, ids[1], ids[0]);
  });
  return { lining: mergeAll([lining.build(), back.build()]), carpet: carpet.build() };
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
  geometry.translate(...centre);
  return geometry;
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

function seats(): { fabric: BufferGeometry; frames: BufferGeometry } {
  const width = CABIN.seatWidth * 0.92;
  const { cushion, back } = INTERIOR;
  const fabric = seatCentres().flatMap(([x, y, z]) => [
    rounded(width, cushion.height, cushion.depth, [x, y, z]),
    rounded(
      width,
      back.height,
      back.depth,
      [x - cushion.depth / 2, y + back.height / 2, z],
      back.lean,
    ),
  ]);
  const frames = seatCentres().map(([x, y, z]) =>
    box({
      minX: x - INTERIOR.pedestal / 2,
      maxX: x + INTERIOR.pedestal / 2,
      minY: CABIN.floorY,
      maxY: y - cushion.height / 2,
      minZ: z - INTERIOR.pedestal,
      maxZ: z + INTERIOR.pedestal,
    }),
  );
  return { fabric: mergeAll(fabric), frames: mergeAll(frames) };
}

function fittings(): { racks: BufferGeometry; glass: BufferGeometry; lamp: BufferGeometry } {
  const rackWall = cabinHalfWidth(INTERIOR.rackY);
  const racks = SIDES.map((side) => {
    const [near, far] = [side * rackWall, side * (rackWall - INTERIOR.rackDepth)];
    return box({
      minX: BACK_X,
      maxX: CUT_X,
      minY: INTERIOR.rackY,
      maxY: INTERIOR.rackY + INTERIOR.rackThickness,
      minZ: Math.min(near, far),
      maxZ: Math.max(near, far),
    });
  });
  const windowBottom = BODY.bandBottom + INTERIOR.windowMargin;
  const windowTop = BODY.bandTop - INTERIOR.windowMargin;
  const wall =
    Math.min(cabinHalfWidth(windowBottom), cabinHalfWidth(windowTop)) - INTERIOR.windowInset;
  const glass = SIDES.map((side) =>
    box({
      minX: BACK_X,
      maxX: CUT_X,
      minY: windowBottom,
      maxY: windowTop,
      minZ: side > 0 ? wall - INTERIOR.windowInset : -wall,
      maxZ: side > 0 ? wall : -wall + INTERIOR.windowInset,
    }),
  );
  const ceiling = BODY.roofY - CABIN.wall;
  const door = box({
    minX: BACK_X,
    maxX: BACK_X + INTERIOR.windowInset,
    minY: CABIN.floorY,
    maxY: CABIN.floorY + INTERIOR.doorHeight,
    minZ: -INTERIOR.doorWidth / 2,
    maxZ: INTERIOR.doorWidth / 2,
  });
  const lamp = box({
    minX: BACK_X,
    maxX: CUT_X,
    minY: ceiling - INTERIOR.lightThickness * 2,
    maxY: ceiling - INTERIOR.lightThickness,
    minZ: -INTERIOR.lightWidth / 2,
    maxZ: INTERIOR.lightWidth / 2,
  });
  return { racks: mergeAll(racks), glass: mergeAll([...glass, door]), lamp };
}

export function buildInterior(context: PartContext, parent: Object3D): void {
  const shell = shellGeometries();
  const seating = seats();
  const extras = fittings();
  const parts = [
    [shell.lining, TRAIN_FINISHES.lining],
    [shell.carpet, TRAIN_FINISHES.carpet],
    [seating.fabric, TRAIN_FINISHES.seat],
    [seating.frames, TRAIN_FINISHES.seatFrame],
    [extras.racks, TRAIN_FINISHES.seatFrame],
    [extras.glass, TRAIN_FINISHES.pane],
    [extras.lamp, TRAIN_FINISHES.lamp],
  ] as const;
  parts.forEach(([geometry, finish]) => {
    const mesh = finishMesh(context, geometry, 'train', finish);
    mesh.name = 'train';
    parent.add(mesh);
  });
}
