import type { BufferGeometry } from 'three';
import { ellipsoid } from './ellipsoid';
import { DELTOID, JOINTS, LIMBS, LIMB_SEGMENTS, SLEEVE } from './shapes';
import type { LimbId } from './shapes';
import { tubeGeometry } from './tube';

const QUARTER = Math.PI / 2;

export function limbGeometry(id: LimbId): BufferGeometry {
  const { stations, capStart, capEnd } = LIMBS[id];
  const { radial, rings, capSteps } = LIMB_SEGMENTS;
  return tubeGeometry({ stations, radial, rings, capStart, capEnd, capSteps });
}

export function sleeveGeometry(): BufferGeometry {
  const { stations, length, capStart } = LIMBS.thigh;
  const { radial, rings, capSteps } = LIMB_SEGMENTS;
  return tubeGeometry({
    stations,
    radial,
    rings,
    capSteps,
    capStart,
    from: 0,
    to: length * SLEEVE.share,
    capEnd: SLEEVE.lip,
    inflate: SLEEVE.inflate,
  });
}

export function neckGeometry(): BufferGeometry {
  return limbGeometry('neck').rotateZ(-QUARTER);
}

export function jointGeometry(id: keyof typeof JOINTS): BufferGeometry {
  return ellipsoid(JOINTS[id], [0, 0, 0]);
}

export function deltoidGeometry(): BufferGeometry {
  return ellipsoid(DELTOID.radii, DELTOID.centre, DELTOID.segments);
}
