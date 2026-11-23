import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { UPPER, UPPER_BACK_M, UPPER_TIP_M, archAt, archPoint } from './design';
import type { Arch } from './design';
import { clusteredStations, gridGeometry, pushQuad } from './grid';
import type { Grid } from './grid';

export const UPPER_FIELDS = 'shoeFields';

const STATIONS = 68;
const SIDE_STEPS = 14;
const HALF_TURN = Math.PI / 2;
const COLLAR = { radiusM: 0.0042, inwardM: 0.0016, liftM: 0.0012, tubular: 120, radial: 8 };

interface RingVertex {
  readonly point: Vector3;
  readonly height: number;
  readonly lateral: number;
}

function sideVertices(x: number, arch: Arch, side: 1 | -1): RingVertex[] {
  return Array.from({ length: SIDE_STEPS + 1 }, (_, k) => {
    const angle = arch.collarAngle + ((HALF_TURN - arch.collarAngle) * k) / SIDE_STEPS;
    const at = archPoint(arch, angle, side);
    return {
      point: new Vector3(x, at.y, at.z),
      height: at.y - arch.base,
      lateral: at.z - arch.ridge,
    };
  });
}

function ringAt(x: number): RingVertex[] {
  const arch = archAt(x);
  const medial = sideVertices(x, arch, -1).reverse();
  const lateral = sideVertices(x, arch, 1);
  return [...medial, ...lateral];
}

function stations(): number[] {
  return clusteredStations(UPPER_BACK_M, UPPER_TIP_M, STATIONS);
}

export function upperGeometry(): BufferGeometry {
  const xs = stations();
  const rings = xs.map(ringAt);
  const ringSize = rings[0].length;
  const grid: Grid = {
    positions: rings.flatMap((ring) => ring.flatMap(({ point }) => point.toArray())),
    fields: rings.flatMap((ring, at) =>
      ring.flatMap(({ height, lateral }) => [xs[at], height, lateral, 0]),
    ),
    stations: xs.length,
    ringSize,
  };
  const faces: number[] = [];
  for (let station = 0; station < xs.length - 1; station++) {
    for (let segment = 0; segment < ringSize - 1; segment++) {
      if (segment === SIDE_STEPS) continue;
      pushQuad(grid, faces, station, segment, true);
    }
  }
  return gridGeometry(grid, [{ material: 0, indices: faces }], UPPER_FIELDS);
}

function collarPoint(x: number, side: 1 | -1): Vector3 {
  const arch = archAt(x);
  const edge = archPoint(arch, arch.collarAngle, side);
  const inward = side * COLLAR.inwardM;
  return new Vector3(x, edge.y + COLLAR.liftM, edge.z - inward);
}

export function collarGeometry(): BufferGeometry {
  const xs = stations().filter((x) => x <= UPPER.openFrontM);
  const lateral = xs.map((x) => collarPoint(x, 1));
  const medial = xs.map((x) => collarPoint(x, -1));
  const loop = [...lateral.slice().reverse(), ...medial.slice(1, -1)];
  const curve = new CatmullRomCurve3(loop, true, 'centripetal');
  return new TubeGeometry(curve, COLLAR.tubular, COLLAR.radiusM, COLLAR.radial, true);
}
