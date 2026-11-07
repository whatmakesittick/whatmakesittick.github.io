import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import type { Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { HARPSICHORD, KEY, UPRIGHT } from '../../../model';
import { THEME } from '../../../theme';
import { registeredMaterial } from '../context';
import type { PartContext } from '../context';
import type { Planar } from './shapes';

const TOWARD_VIEWER = -0.016;
const TICK = 0.012;
const OVERSHOOT = 0.03;
const OPACITY = 0.6;
const KEY_FRONTS = [KEY.frontZ, UPRIGHT.offsetZ, HARPSICHORD.offsetZ] as const;

export function leaderSegments(): [Planar, Planar][] {
  const bottom = KEY.top - KEY.thickness - TICK;
  const level: [Planar, Planar] = [
    [KEY.top, KEY.frontZ - KEY.length],
    [KEY.top, HARPSICHORD.offsetZ + OVERSHOOT],
  ];
  return [
    level,
    ...KEY_FRONTS.map((z): [Planar, Planar] => [
      [bottom, z],
      [KEY.top + TICK, z],
    ]),
  ];
}

export function buildLeaders(context: PartContext): Object3D {
  const points = leaderSegments().flatMap((segment) =>
    segment.flatMap(([y, z]) => [TOWARD_VIEWER, y, z]),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  const material = new LineBasicMaterial({
    color: THEME.insetLine,
    transparent: true,
    opacity: OPACITY,
    fog: false,
    toneMapped: false,
  });
  const lines = new LineSegments(
    context.tracker.track(geometry),
    registeredMaterial(context, STRUCTURE_GROUP, material, false),
  );
  lines.name = 'lineUpLeaders';
  return lines;
}
