import { BoxGeometry, CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { CHAIN_LINKS, MM } from '../constants';
import { mergeParts } from './merge';
import { extrudeAlongZ, roundedOutline } from './profile';
import type { Outline } from './profile';

export type CutterSide = 'left' | 'right';

const ROUNDING = 0.45 * MM;
const ROUNDING_SEGMENTS = 3;

function millimetres(points: readonly (readonly [number, number])[]): Outline {
  return points.map(([x, y]) => [x * MM, y * MM] as const);
}

const DRIVE_LINK = millimetres([
  [-6.8, -0.4],
  [-6, 2.2],
  [6, 2.2],
  [6.8, -0.4],
  [4, -2.6],
  [1.4, -5.1],
  [-1.2, -5.1],
  [-3.6, -2.6],
]);

const TIE_STRAP = millimetres([
  [-7.4, -2.9],
  [7.4, -2.9],
  [7.8, -0.6],
  [7, 2.6],
  [-7, 2.6],
  [-7.8, -0.6],
]);

const CUTTER_PLATE = millimetres([
  [-7.4, -2.9],
  [3.4, -2.9],
  [3.4, 1.1],
  [1.6, 1.6],
  [0.5, 4.6],
  [0.2, 6.7],
  [-5.6, 6.1],
  [-7.4, 4.3],
]);

const DEPTH_GAUGE = millimetres([
  [3.3, -2.9],
  [7.8, -2.9],
  [7.8, 1.5],
  [6.7, 5.4],
  [4.9, 5.85],
  [3.8, 3.2],
  [3.3, -0.8],
]);

const TOP_PLATE = {
  from: -5.6 * MM,
  to: 0.2 * MM,
  bottom: 5.4 * MM,
  top: 6.7 * MM,
  reach: 3.4 * MM,
} as const;

function plate(outline: Outline, centreZ: number, thickness: number): BufferGeometry {
  return extrudeAlongZ(
    roundedOutline(outline, ROUNDING),
    { from: centreZ - thickness / 2, to: centreZ + thickness / 2 },
    0,
    ROUNDING_SEGMENTS,
  );
}

export function driveLinkGeometry(): BufferGeometry {
  return plate(DRIVE_LINK, 0, CHAIN_LINKS.driveThickness);
}

export function tieStrapGeometry(): BufferGeometry {
  return plate(TIE_STRAP, 0, CHAIN_LINKS.sideThickness);
}

export function depthGaugeGeometry(): BufferGeometry {
  return plate(DEPTH_GAUGE, 0, CHAIN_LINKS.sideThickness);
}

export function cutterGeometry(side: CutterSide): BufferGeometry {
  const sign = side === 'left' ? -1 : 1;
  const sideZ = sign * CHAIN_LINKS.sideOffset;
  const outerZ = sideZ + (sign * CHAIN_LINKS.sideThickness) / 2;
  const farZ = -sign * TOP_PLATE.reach;
  const top = new BoxGeometry(
    TOP_PLATE.to - TOP_PLATE.from,
    TOP_PLATE.top - TOP_PLATE.bottom,
    Math.abs(outerZ - farZ),
  );
  top.translate(
    (TOP_PLATE.from + TOP_PLATE.to) / 2,
    (TOP_PLATE.bottom + TOP_PLATE.top) / 2,
    (outerZ + farZ) / 2,
  );
  return mergeParts([plate(CUTTER_PLATE, sideZ, CHAIN_LINKS.sideThickness), top]);
}

export function rivetGeometry(): BufferGeometry {
  const rivet = new CylinderGeometry(
    CHAIN_LINKS.rivetRadius,
    CHAIN_LINKS.rivetRadius,
    CHAIN_LINKS.rivetLength,
    10,
  );
  rivet.rotateX(Math.PI / 2);
  return rivet;
}
