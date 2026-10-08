import { Shape, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { extrudeProfileAlongX } from '@core/scene/geometry/extrude';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { partMesh } from '../../context';
import type { PartContext } from '../../context';
import { AXIS_Y, DECK_Y, SEGMENTS } from './constants';
import { boltRing, merge, rodUp, turned } from './geometry';

const HOUSING_PROFILE: readonly ProfilePoint[] = [
  [-4.08, 0.6],
  [-4.08, 0.78],
  [-3.98, 0.78],
  [-3.98, 1.08],
  [-3.94, 1.2],
  [-3.86, 1.2],
  [-3.86, 1.15],
  [-3.34, 1.15],
  [-3.34, 1.2],
  [-3.26, 1.2],
  [-3.22, 1.08],
  [-3.22, 0.78],
  [-3.12, 0.78],
  [-3.12, 0.6],
];

const FRONT_BOLTS = {
  count: 12,
  radius: 0.93,
  x: -3.98,
  side: -1,
  head: 0.03,
  length: 0.04,
} as const;
const REAR_BOLTS = {
  count: 12,
  radius: 0.93,
  x: -3.22,
  side: 1,
  head: 0.03,
  length: 0.04,
} as const;

const FOOT = { minX: -3.95, maxX: -3.25, plateTop: 103.68, webTop: 104.4 } as const;
const FOOT_SECTION: readonly (readonly [z: number, y: number])[] = [
  [-1.45, DECK_Y],
  [1.45, DECK_Y],
  [1.45, FOOT.plateTop],
  [1.1, FOOT.plateTop],
  [0.75, FOOT.webTop],
  [-0.75, FOOT.webTop],
  [-1.1, FOOT.plateTop],
  [-1.45, FOOT.plateTop],
];

const HOLD_DOWN = { xs: [-3.85, -3.6, -3.35], z: 1.3, radius: 0.035, height: 0.07 } as const;

function holdDownBolts(): BufferGeometry[] {
  const bolt = rodUp(
    [FOOT.plateTop, FOOT.plateTop + HOLD_DOWN.height],
    HOLD_DOWN.radius,
    SEGMENTS.bolt,
  );
  const bolts = HOLD_DOWN.xs.flatMap((x) =>
    [-HOLD_DOWN.z, HOLD_DOWN.z].map((z) => bolt.clone().translate(x, 0, z)),
  );
  bolt.dispose();
  return bolts;
}

function housing(): BufferGeometry {
  return merge([
    turned(HOUSING_PROFILE, SEGMENTS.large),
    ...boltRing(FRONT_BOLTS),
    ...boltRing(REAR_BOLTS),
  ]).translate(0, AXIS_Y, 0);
}

function foot(): BufferGeometry {
  const shape = new Shape(FOOT_SECTION.map(([z, y]) => new Vector2(z, y)));
  return extrudeProfileAlongX(shape, FOOT.minX, FOOT.maxX);
}

export function buildMainBearing(context: PartContext, parent: Object3D): void {
  parent.add(partMesh(context, merge([housing(), foot(), ...holdDownBolts()]), 'mainBearing'));
}
