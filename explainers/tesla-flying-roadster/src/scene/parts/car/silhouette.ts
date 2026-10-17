import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { buildShell } from '../../geometry/body/shell';
import type { SegmentCells } from '../../geometry/body/shell';
import { bodyStations, COARSE_STATIONS } from '../../geometry/body/stations';
import { mergeParts } from '../context';
import { WHEEL, WHEEL_CENTRES } from './dimensions';

const WHEEL_SEGMENTS = 12;

const OUTLINE_CELLS: SegmentCells = {
  floor: 1,
  wellWall: 1,
  wellRoof: 1,
  sill: 1,
  side: 2,
  shoulder: 2,
  belt: 1,
  glass: 1,
  rail: 1,
  crown: 3,
};

function wheel([x, y, z]: readonly [number, number, number]): BufferGeometry {
  const geometry = new CylinderGeometry(
    WHEEL.radius,
    WHEEL.radius,
    WHEEL.tyreWidth,
    WHEEL_SEGMENTS,
  );
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, y, z);
  geometry.deleteAttribute('uv');
  return geometry;
}

export function carSilhouette(): BufferGeometry {
  const shell = buildShell(bodyStations(COARSE_STATIONS), OUTLINE_CELLS);
  return mergeParts([...shell.values(), ...WHEEL_CENTRES.map(wheel)]);
}
