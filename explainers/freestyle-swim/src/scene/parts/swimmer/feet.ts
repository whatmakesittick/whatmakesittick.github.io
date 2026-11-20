import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ellipsoid } from './ellipsoid';
import { FOOT } from './shapes';
import { tubeGeometry } from './tube';

function toe(index: number, side: number): BufferGeometry {
  const { base, lengths, radii, spread, radial, splay } = FOOT.toes;
  const radius = radii[index];
  return tubeGeometry({
    stations: [
      [0, radius, radius * 0.85, radius * 0.9],
      [lengths[index] - radius, radius * 0.9, radius * 0.78, radius * 0.8],
    ],
    radial,
    rings: 2,
    capStart: radius,
    capEnd: radius * 0.9,
  })
    .rotateZ(-side * splay * (index - 1))
    .translate(side * spread[index], base, 0);
}

function ankleBones(): BufferGeometry[] {
  const { radii, x, y, z } = FOOT.ankleBone;
  return [1, -1].map((sign) => ellipsoid(radii, [sign * x, y, z]));
}

export function footGeometry(side: number): BufferGeometry {
  const { stations, radial, rings, capStart, capEnd } = FOOT;
  const parts = [
    tubeGeometry({ stations, radial, rings, capStart, capEnd }),
    ...[0, 1, 2, 3, 4].map((index) => toe(index, side)),
    ...ankleBones(),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}
