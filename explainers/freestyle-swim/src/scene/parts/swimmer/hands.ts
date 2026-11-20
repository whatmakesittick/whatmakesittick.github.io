import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HAND } from './shapes';
import { tubeGeometry } from './tube';

function finger(index: number, side: number): BufferGeometry {
  const { base, radius, spacing, lengths, curlRad, radial, rings } = HAND.finger;
  const reach = lengths[index] - radius;
  return tubeGeometry({
    stations: [
      [0, radius, radius, radius],
      [reach * 0.5, radius * 0.97, radius * 0.9, radius * 0.88],
      [reach, radius * 0.9, radius * 0.8, radius * 0.78],
    ],
    radial,
    rings,
    capStart: radius,
    capEnd: radius * 0.9,
  })
    .rotateX(curlRad)
    .translate(side * spacing * (1.5 - index), base, 0);
}

function thumb(side: number): BufferGeometry {
  const { radius, length, base, splayRad, cupRad } = HAND.thumb;
  return tubeGeometry({
    stations: [
      [0, radius * 1.1, radius, radius],
      [length * 0.5, radius, radius * 0.9, radius * 0.9],
      [length - radius, radius * 0.88, radius * 0.8, radius * 0.8],
    ],
    radial: HAND.finger.radial,
    rings: HAND.finger.rings,
    capStart: radius,
    capEnd: radius * 0.9,
  })
    .rotateX(cupRad)
    .rotateZ(-side * splayRad)
    .translate(side * base[0], base[1], base[2]);
}

export function handGeometry(side: number): BufferGeometry {
  const { palm, radial } = HAND;
  const parts = [
    tubeGeometry({ ...palm, radial }),
    ...[0, 1, 2, 3].map((index) => finger(index, side)),
    thumb(side),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

export function wristbandGeometry(): BufferGeometry {
  return tubeGeometry({ ...HAND.band, radial: HAND.radial, rings: 2 });
}
