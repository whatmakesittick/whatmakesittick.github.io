import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../model';
import {
  boxOver,
  cylinderBetween,
  evenlySpaced,
  extrudeAlongX,
  mergeParts,
  profileShape,
} from '../geometry';
import type { ProfilePoint } from '../geometry';
import { CANOPY, CANOPY_COLUMN, FLOOR, HALF_LENGTH, LIGHT_STRIP } from './constants';

const RISE = CANOPY.crown - CANOPY.eave;
const RADIUS = (CANOPY.halfSpan ** 2 + RISE ** 2) / (2 * RISE);
const CENTRE_Y = CANOPY.crown - RADIUS;
const UNDERSIDE = RADIUS - CANOPY.thickness;

export function arcHeight(z: number, radius = RADIUS): number {
  return CENTRE_Y + Math.sqrt(radius * radius - z * z);
}

function arcPoints(from: number, to: number, radius: number): ProfilePoint[] {
  return Array.from({ length: CANOPY.steps + 1 }, (_, step) => {
    const z = from + ((to - from) * step) / CANOPY.steps;
    return [z, arcHeight(z, radius)];
  });
}

function band(from: number, to: number, outer: number, inner: number): ProfilePoint[] {
  return [...arcPoints(from, to, outer), ...arcPoints(to, from, inner)];
}

function alongCanopy(points: readonly ProfilePoint[]): BufferGeometry {
  const half = CANOPY.length / 2;
  return extrudeAlongX(profileShape(points), -half, half, CANOPY.endChamfer);
}

export function canopyShell(): BufferGeometry {
  return mergeParts(
    SIDE_SIGNS.map((side) => {
      const [from, to] = [side * CANOPY.skylightHalf, side * CANOPY.halfSpan];
      return alongCanopy(band(from, to, RADIUS, UNDERSIDE));
    }),
  );
}

export function skylight(): BufferGeometry {
  const outer = RADIUS + CANOPY.skylightLift;
  const reach = CANOPY.skylightHalf + CANOPY.gutterWidth;
  return alongCanopy(band(-reach, reach, outer, outer - CANOPY.skylightThickness));
}

function rib(x: number): BufferGeometry {
  const half = CANOPY.ribWidth / 2;
  const reach = CANOPY.halfSpan - CANOPY.ribInset;
  const points = band(-reach, reach, UNDERSIDE, UNDERSIDE - CANOPY.ribDepth);
  return extrudeAlongX(profileShape(points), x - half, x + half);
}

export function ribPositions(): number[] {
  const count = Math.floor(CANOPY.length / CANOPY.ribSpacing);
  return evenlySpaced(count, -CANOPY.length / 2, CANOPY.length / 2);
}

function gutter(side: number): BufferGeometry {
  const half = CANOPY.length / 2;
  const outer = side * CANOPY.halfSpan;
  const inner = side * (CANOPY.halfSpan - CANOPY.gutterWidth);
  return boxOver(
    [-half, half],
    [CANOPY.eave - CANOPY.gutterDepth, CANOPY.eave + 0.04],
    [Math.min(outer, inner), Math.max(outer, inner)],
  );
}

export function canopyFrame(): BufferGeometry {
  return mergeParts([...ribPositions().map(rib), ...SIDE_SIGNS.map(gutter)]);
}

function column(x: number, side: number): BufferGeometry[] {
  const { z, baseRadius, topRadius, forkHeight, forkSpread, strutRadius, segments } = CANOPY_COLUMN;
  const base = new Vector3(x, FLOOR, side * z);
  const fork = new Vector3(x, forkHeight, side * z);
  const reach = UNDERSIDE - CANOPY.ribDepth;
  const tips = [-1, 1].map((lean) => {
    const tipZ = side * (z + lean * forkSpread);
    return new Vector3(x, arcHeight(tipZ, reach), tipZ);
  });
  return [
    cylinderBetween(base, fork, [baseRadius, topRadius], segments),
    ...tips.map((tip) => cylinderBetween(fork, tip, [topRadius, strutRadius], segments)),
  ];
}

export function canopyColumns(): BufferGeometry {
  return mergeParts(
    ribPositions()
      .filter((x) => Math.abs(x) <= HALF_LENGTH)
      .flatMap((x) => SIDE_SIGNS.flatMap((side) => column(x, side))),
  );
}

export function lightStrips(): BufferGeometry {
  return mergeParts(
    SIDE_SIGNS.map((side) => {
      const top = arcHeight(LIGHT_STRIP.z, UNDERSIDE - CANOPY.ribDepth) - LIGHT_STRIP.drop;
      const centre = side * LIGHT_STRIP.z;
      return boxOver(
        [-HALF_LENGTH, HALF_LENGTH],
        [top - LIGHT_STRIP.height, top],
        [centre - LIGHT_STRIP.width / 2, centre + LIGHT_STRIP.width / 2],
      );
    }),
  );
}
