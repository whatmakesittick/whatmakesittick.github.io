import { ShapeGeometry } from 'three';
import type { BufferGeometry, Object3D, Vector2 } from 'three';
import { roundedRectHole, roundedRectShape } from '@core/scene/geometry/extrude';
import { FINISHES } from '../../finishes';
import type { PartContext } from '../context';
import { BODY, DOOR, PANE } from './constants';
import { TRAIN_FINISHES } from './finishes';
import { cutInstances, showAhead } from './instances';
import type { CutInstances } from './instances';
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
  geometry.deleteAttribute('uv');
  return geometry;
}

export function paneGeometry(width: number): BufferGeometry {
  const half = { a: width / 2, b: PANE.height / 2 };
  const shape = roundedRectShape(
    { minA: -half.a, maxA: half.a, minB: BAND_MIDDLE - half.b, maxB: BAND_MIDDLE + half.b },
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

export function densified(outer: Vector2[], inner: Vector2[]): [Vector2[], Vector2[]] {
  const dense: [Vector2[], Vector2[]] = [[], []];
  outer.slice(0, -1).forEach((from, index) => {
    const pieces = Math.max(1, Math.ceil(from.distanceTo(outer[index + 1]) / DOOR.step));
    for (let piece = 0; piece < pieces; piece += 1) {
      const share = piece / pieces;
      dense[0].push(from.clone().lerp(outer[index + 1], share));
      dense[1].push(inner[index].clone().lerp(inner[index + 1], share));
    }
  });
  dense[0].push(outer[outer.length - 1].clone());
  dense[1].push(inner[inner.length - 1].clone());
  return dense;
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

export interface Windows {
  readonly sets: readonly CutInstances[];
  showAhead(shown: boolean): void;
}

export function buildWindows(context: PartContext, parent: Object3D): Windows {
  const windows = TRAIN_LAYOUT.flatMap((section) => section.windows);
  const doors = TRAIN_LAYOUT.flatMap((section) => section.doors);
  const sets = [
    cutInstances(context, paneGeometry(PANE.width), 'train', TRAIN_FINISHES.pane, windows),
    cutInstances(context, paneGeometry(DOOR.windowWidth), 'train', TRAIN_FINISHES.pane, doors),
    cutInstances(context, doorFrameGeometry(), 'train', FINISHES.joint, doors),
  ];
  sets.forEach((set) => parent.add(set.mesh));
  return { sets, showAhead: (shown) => sets.forEach((set) => showAhead(set, shown)) };
}
