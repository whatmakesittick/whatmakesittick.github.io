import {
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  Vector3,
} from 'three';
import type { Group, Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN, lerp, toRadians } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import { FAN_BLADES } from '../../model/engineFacts';
import { SPIN_SENSE } from '../../model/scale';
import { FAN, SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { bladeGeometry } from '../geometry/blade';
import { casingAt, hubAt, nacelleOuterAt, radiusCurve } from '../geometry/profiles';
import type { RadiusAt } from '../geometry/profiles';
import { closedLoop, revolve } from '../geometry/revolve';
import { appendRing, emptyRing, ringGeometry } from '../geometry/rows';
import type { AccessDoor, RivetRow } from './detailPatches';
import type { PartContext } from './context';
import { STRUCTURE_GROUP, coreMaterial, cutMaterial, material, mesh, namedGroup } from './context';

type Crest = readonly (readonly [x: number, height: number])[];

interface Fin {
  readonly base: RadiusAt;
  readonly from: number;
  readonly to: number;
  readonly crest: Crest;
  readonly width: number;
  readonly angle: number;
}

const PLATFORM = {
  from: -2.56,
  to: -2.12,
  lift: 0.012,
  sink: 0.006,
  fill: 0.82,
  columns: 7,
  rows: 3,
  stagger: toRadians(20),
} as const;

const PLATFORM_BASE = radiusCurve([
  [-2.6, 0.34],
  [-2.5, 0.41],
  [-2.42, 0.445],
  [-2.3, 0.47],
  [-2.16, 0.5],
  [-2.1, 0.505],
]);

const SPINNER_JOINT = {
  x: -2.42,
  radius: 0.445,
  width: 0.016,
  rise: 0.008,
  bolts: 24,
  bolt: 0.0055,
} as const;

const RUB = { from: -2.5, to: -2.12, radius: 1.72, inner: 0.012, outer: 0.004 } as const;

const RUB_FINISH: MaterialFinish = {
  color: '#8a7d6c',
  roughness: 0.92,
  metalness: 0.05,
  side: DoubleSide,
  forceSinglePass: true,
};

const STRUTS = { count: 8, from: -1.58, to: -1.46, overlap: 0.012, thickness: 0.13 } as const;

const PROBE = {
  x: -2.66,
  wall: 1.742,
  angle: -toRadians(45),
  reach: 0.1,
  stem: 0.011,
  head: 0.017,
  headLength: 0.085,
  boss: 0.03,
} as const;

const EMBED = 0.012;
const CHINE = {
  from: -2.3,
  to: -1.9,
  height: 0.09,
  width: 0.022,
  angle: toRadians(58),
  samples: 12,
} as const;
const MAST = {
  width: 0.016,
  angle: Math.PI,
  crest: [
    [0.96, 0],
    [0.955, 0.085],
    [0.935, 0.1],
    [0.86, 0],
  ],
} as const;
const SCOOP = { length: 0.13, hood: 0.024, width: 0.11, slot: 0.145, lift: 0.0015 } as const;
const SCOOP_SPOTS = [
  { x: -0.62, angle: toRadians(24) },
  { x: -0.62, angle: toRadians(158) },
] as const;

export const RIVET_ROWS: readonly RivetRow[] = [-2.6, -1.62, -0.12, 1.25].map((x) => {
  const radius = nacelleOuterAt(x);
  return { x, radius, count: Math.round((FULL_TURN * radius) / 0.05), size: 0.004 };
});

export const FAN_COWL_DOORS: readonly AccessDoor[] = [
  { x: [-1.2, -0.5], angle: [toRadians(70), toRadians(112)], radius: nacelleOuterAt(-0.85) },
  { x: [-1.2, -0.5], angle: [toRadians(-112), toRadians(-70)], radius: nacelleOuterAt(-0.85) },
];

export const LINER_HOLES = {
  from: -2.6,
  to: -2.49,
  radius: 1.72,
  pitch: 0.012,
  holeShare: 0.55,
} as const;

function plain(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute('uv');
  if (flat !== geometry) geometry.dispose();
  return flat;
}

function merged(parts: readonly BufferGeometry[]): BufferGeometry {
  const result = mergeGeometries(parts.map(plain));
  parts.forEach((part) => part.dispose());
  return result;
}

function grid(
  point: (u: number, v: number) => Vector3,
  columns: number,
  rows: number,
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const { x, y, z } = point(column / columns, row / rows);
      positions.push(x, y, z);
    }
  }
  const stride = columns + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function onCircle(x: number, radius: number, angle: number): Vector3 {
  return new Vector3(x, radius * Math.cos(angle), radius * Math.sin(angle));
}

function platformSegment(index: number): BufferGeometry {
  const pitch = FULL_TURN / FAN_BLADES;
  const centre = (index + 0.5) * pitch;
  const reach = (u: number) => lerp(PLATFORM.from, PLATFORM.to, u);
  const angleAt = (x: number, v: number) =>
    centre +
    (SPIN_SENSE * ((x - FAN.stackX) * Math.tan(PLATFORM.stagger))) / PLATFORM_BASE(x) +
    (v - 0.5) * pitch * PLATFORM.fill;
  const outer = (u: number, v: number) => {
    const x = reach(u);
    return onCircle(x, PLATFORM_BASE(x) + PLATFORM.lift, angleAt(x, v));
  };
  const wall = (side: number) => (u: number, v: number) => {
    const x = reach(u);
    const radius = PLATFORM_BASE(x) + lerp(PLATFORM.lift, -PLATFORM.sink, v);
    return onCircle(x, radius, angleAt(x, side));
  };
  return merged([
    grid(outer, PLATFORM.columns, PLATFORM.rows),
    grid(wall(0), PLATFORM.columns, 1),
    grid(wall(1), PLATFORM.columns, 1),
  ]);
}

function platformGeometry(): BufferGeometry {
  return merged(Array.from({ length: FAN_BLADES }, (_, index) => platformSegment(index)));
}

function jointGeometry(): BufferGeometry {
  const { x, radius, width, rise, bolts, bolt } = SPINNER_JOINT;
  const ring = revolve(
    closedLoop([
      [x - width / 2, radius - rise],
      [x - width / 2, radius + rise],
      [x + width / 2, radius + rise],
      [x + width / 2, radius - rise],
    ]),
    SEGMENTS.small,
  );
  const heads = Array.from({ length: bolts }, (_, index) => {
    const head = new CylinderGeometry(bolt, bolt, rise, 6);
    head.rotateZ(Math.PI / 2);
    head.translate(x - width / 2 - rise / 2, radius, 0);
    head.rotateX((FULL_TURN * index) / bolts);
    return head;
  });
  return merged([ring, ...heads]);
}

function rubGeometry(): BufferGeometry {
  const { from, to, radius, inner, outer } = RUB;
  return revolve(
    closedLoop([
      [from, radius - inner],
      [to, radius - inner],
      [to, radius + outer],
      [from, radius + outer],
    ]),
    SEGMENTS.shell,
  );
}

function strutGeometry(): BufferGeometry {
  const middle = (STRUTS.from + STRUTS.to) / 2;
  const blade = bladeGeometry({
    hub: hubAt(middle) - STRUTS.overlap,
    tip: casingAt(middle) + STRUTS.overlap,
    stations: 3,
    samples: 6,
    chord: () => STRUTS.to - STRUTS.from,
    stagger: () => 0,
    camber: () => 0,
    thickness: () => STRUTS.thickness,
  });
  blade.translate(middle, 0, 0);
  const buffers = emptyRing();
  appendRing(buffers, blade, STRUTS.count, 0);
  blade.dispose();
  return ringGeometry(buffers);
}

function finGeometry(fin: Fin): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(fin.from, fin.base(fin.from) - EMBED);
  shape.lineTo(fin.to, fin.base(fin.to) - EMBED);
  fin.crest.forEach(([x, height]) => shape.lineTo(x, fin.base(x) + height));
  const geometry = new ExtrudeGeometry(shape, { depth: fin.width, bevelEnabled: false });
  geometry.translate(0, 0, -fin.width / 2);
  geometry.rotateX(fin.angle);
  return geometry;
}

function chineCrest(): Crest {
  const { from, to, height, samples } = CHINE;
  return Array.from({ length: samples + 1 }, (_, index) => {
    const share = 1 - index / samples;
    return [
      lerp(from, to, share),
      height * Math.max(0.04, Math.sin(Math.PI * share) ** 0.7),
    ] as const;
  });
}

function probeGeometry(): BufferGeometry {
  const { x, wall, angle, reach, stem, head, headLength, boss } = PROBE;
  const post = new CylinderGeometry(stem, stem * 1.4, reach, 10);
  post.translate(x, wall - reach / 2, 0);
  const tube = new CylinderGeometry(head, head, headLength, 12);
  tube.rotateZ(Math.PI / 2);
  tube.translate(x - headLength * 0.25, wall - reach, 0);
  const base = new CylinderGeometry(boss, boss, 0.014, 16);
  base.translate(x, wall - 0.004, 0);
  return merged([post, tube, base]).rotateX(angle);
}

function scoopHood(x: number, angle: number): BufferGeometry {
  const front = x - SCOOP.length / 2;
  const back = x + SCOOP.length / 2;
  return finGeometry({
    base: nacelleOuterAt,
    from: front + 0.04,
    to: back,
    crest: [
      [back, 0],
      [back - 0.006, SCOOP.hood],
      [front + 0.07, SCOOP.hood * 0.7],
      [front + 0.04, 0],
    ],
    width: SCOOP.width,
    angle,
  });
}

function scoopSlot(x: number, angle: number): BufferGeometry {
  const front = x - SCOOP.length / 2 - 0.02;
  const back = x + SCOOP.length / 2 + 0.01;
  const halfArc = SCOOP.slot / 2 / nacelleOuterAt(x);
  return grid(
    (u, v) => {
      const at = lerp(front, back, u);
      return onCircle(at, nacelleOuterAt(at) + SCOOP.lift, angle + (v - 0.5) * 2 * halfArc);
    },
    6,
    2,
  );
}

function nacelleFins(): BufferGeometry {
  const chine = finGeometry({
    base: nacelleOuterAt,
    from: CHINE.from,
    to: CHINE.to,
    crest: chineCrest(),
    width: CHINE.width,
    angle: CHINE.angle,
  });
  const mast = finGeometry({
    base: nacelleOuterAt,
    from: MAST.crest[3][0],
    to: MAST.crest[0][0],
    crest: MAST.crest,
    width: MAST.width,
    angle: MAST.angle,
  });
  return merged([chine, mast, ...SCOOP_SPOTS.map((spot) => scoopHood(spot.x, spot.angle))]);
}

function scoopSlots(): BufferGeometry {
  return merged(SCOOP_SPOTS.map((spot) => scoopSlot(spot.x, spot.angle)));
}

function addMesh(
  context: PartContext,
  parent: Group,
  name: string,
  geometry: BufferGeometry,
  surface: Material,
): void {
  mesh(context, namedGroup(name, parent), geometry, surface);
}

export function buildFanDetails(context: PartContext, engine: Group, innerSpool: Group): Group {
  const details = namedGroup('fanDetails', engine);
  addMesh(
    context,
    innerSpool,
    'fanPlatforms',
    platformGeometry(),
    material(context, 'fanBlades', FINISHES.fanHub),
  );
  addMesh(
    context,
    innerSpool,
    'spinnerJoint',
    jointGeometry(),
    material(context, 'spinner', FINISHES.bladeEdge),
  );
  addMesh(context, details, 'rubStrip', rubGeometry(), cutMaterial(context, 'fanCase', RUB_FINISH));
  addMesh(
    context,
    details,
    'hubFrameStruts',
    strutGeometry(),
    coreMaterial(context, STRUCTURE_GROUP, FINISHES.strut),
  );
  addMesh(
    context,
    details,
    'intakeProbe',
    probeGeometry(),
    cutMaterial(context, 'nacelle', FINISHES.intakeLip),
  );
  addMesh(
    context,
    details,
    'nacelleFins',
    nacelleFins(),
    cutMaterial(context, 'nacelle', FINISHES.nacelle),
  );
  addMesh(
    context,
    details,
    'coolingSlots',
    scoopSlots(),
    cutMaterial(context, 'nacelle', FINISHES.nacelleCavity),
  );
  return details;
}
