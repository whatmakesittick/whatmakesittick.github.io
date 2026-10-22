import { ShapeGeometry } from 'three';
import type { BufferGeometry, Object3D, Vector2 } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { roundedRectHole, roundedRectShape } from '@core/scene/geometry/extrude';
import { FINISHES } from '../../finishes';
import type { PartContext } from '../context';
import { BODY, DOOR, PANE } from './constants';
import { TRAIN_FINISHES } from './finishes';
import { allAhead, cutInstances } from './instances';
import type { ShowAhead } from './instances';
import { TRAIN_LAYOUT } from './layout';
import { MeshBuilder } from './mesh';
import { mirroredPair } from './mirror';
import type { Vec3 } from './nose';
import { sideAt } from './profile';

const BAND_MIDDLE = (BODY.bandBottom + BODY.bandTop) / 2;

function onSide(x: number, y: number, lift: number): { point: Vec3; normal: Vec3 } {
  const side = sideAt(y);
  return {
    point: [x, y + side.ny * lift, side.z + side.nz * lift],
    normal: [0, side.ny, side.nz],
  };
}

function wrapOnSide(geometry: BufferGeometry, lift: number): BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  for (let index = 0; index < position.count; index += 1) {
    const placed = onSide(position.getX(index), position.getY(index), lift);
    position.setXYZ(index, ...placed.point);
    normal.setXYZ(index, ...placed.normal);
  }
  return geometry;
}

export function paneGeometry(width: number): BufferGeometry {
  const half = PANE.height / 2;
  const shape = roundedRectShape(
    { minA: -width / 2, maxA: width / 2, minB: BAND_MIDDLE - half, maxB: BAND_MIDDLE + half },
    PANE.radius,
  );
  return mirroredPair(wrapOnSide(new ShapeGeometry(shape, PANE.curveSegments), PANE.lift));
}

function outline(inset: number): Vector2[] {
  const half = DOOR.width / 2 - inset;
  const path = roundedRectHole(
    { minA: -half, maxA: half, minB: DOOR.bottom + inset, maxB: DOOR.top - inset },
    DOOR.radius - inset,
  );
  return path.getPoints(DOOR.cornerDivisions);
}

function densified(outer: Vector2[], inner: Vector2[]): Vector2[][] {
  const pieces = outer
    .slice(1)
    .map((to, index) => Math.max(1, Math.ceil(outer[index].distanceTo(to) / DOOR.step)));
  return [outer, inner].map((line) => [
    ...pieces.flatMap((count, index) =>
      Array.from({ length: count }, (_, piece) =>
        line[index].clone().lerp(line[index + 1], piece / count),
      ),
    ),
    line[line.length - 1].clone(),
  ]);
}

export function doorFrameGeometry(): BufferGeometry {
  const builder = new MeshBuilder();
  const [outer, inner] = densified(outline(0), outline(DOOR.line));
  const vertex = (point: Vector2) => {
    const placed = onSide(point.x, point.y, DOOR.lift);
    return builder.vertex(placed.point, placed.normal);
  };
  const outerIds = outer.map(vertex);
  const innerIds = inner.map(vertex);
  for (let at = 0; at < outer.length - 1; at += 1) {
    builder.triangle(outerIds[at], outerIds[at + 1], innerIds[at + 1]);
    builder.triangle(outerIds[at], innerIds[at + 1], innerIds[at]);
  }
  return mirroredPair(builder.build());
}

export function buildWindows(context: PartContext, parent: Object3D): ShowAhead {
  const windows = TRAIN_LAYOUT.flatMap((section) => section.windows);
  const doors = TRAIN_LAYOUT.flatMap((section) => section.doors);
  const set = (geometry: BufferGeometry, finish: MaterialFinish, slots: number[]) =>
    cutInstances(context, parent, geometry, 'train', finish, slots);
  return allAhead([
    set(paneGeometry(PANE.width), TRAIN_FINISHES.pane, windows),
    set(paneGeometry(DOOR.windowWidth), TRAIN_FINISHES.pane, doors),
    set(doorFrameGeometry(), FINISHES.joint, doors),
  ]);
}
