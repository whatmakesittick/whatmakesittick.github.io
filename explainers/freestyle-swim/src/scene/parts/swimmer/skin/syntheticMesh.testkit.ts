import { Vector3 } from 'three';
import { INFLUENCES, SLOT_IDS, centreBone, mirrorBone, sideBone } from './types';
import type { RestPose, RestSide, SkinMesh, SlotId, Triple } from './types';

type Influence = readonly [number, number];
type Weighting = (t: number) => readonly Influence[];

interface Chain {
  readonly from: Triple;
  readonly to: Triple;
  readonly radius: number;
  readonly weighting: Weighting;
  readonly centred?: boolean;
}

export interface SyntheticMesh {
  readonly mesh: SkinMesh;
  readonly mirrorOf: Int32Array;
  readonly surfaceCount: number;
  readonly markers: Readonly<
    Record<'elbow' | 'wrist' | 'fingertip' | 'knee' | 'ankle' | 'toeTip', number>
  >;
  readonly forearmRing: readonly number[];
}

const RING_POINTS = 8;
const RESOLUTION = 1e5;
const FOREARM_RING_RADIUS = 0.03;

const RIGHT: RestSide = {
  clavicle: [0, 0, 0.02],
  shoulder: [0, 0, 0.18],
  elbow: [-0.26, 0, 0.28],
  wrist: [-0.5, 0, 0.38],
  fingertip: [-0.67, 0, 0.43],
  palm: [0, -1, 0],
  elbowBack: [0, 1, 0],
  hip: [-0.52, -0.02, 0.09],
  knee: [-0.9, -0.02, 0.11],
  ankle: [-1.28, -0.02, 0.12],
  toeTip: [-1.3, -0.22, 0.12],
  sole: [-0.995, 0.0995, 0],
  eye: [0.2, -0.05, 0.03],
};

function mirrorTriple(value: Triple): Triple {
  return [value[0], value[1], -value[2]];
}

function mirrorSide(side: RestSide): RestSide {
  const entries = Object.entries(side).map(([key, value]) => [key, mirrorTriple(value)]);
  return Object.fromEntries(entries) as unknown as RestSide;
}

export const SYNTHETIC_REST: RestPose = {
  right: RIGHT,
  left: mirrorSide(RIGHT),
  neck: [0.1, 0, 0],
  headTop: [0.34, 0, 0],
  eyeRadius: 0.012,
  strap: [
    [0.2, 0, 0.08],
    [0.2, 0, -0.08],
  ],
};

function pair(a: ReturnType<typeof sideBone>, b: ReturnType<typeof sideBone>): Weighting {
  return (t) => [
    [a, 1 - t],
    [b, t],
  ];
}

function sideChains(side: 'right' | 'left'): Chain[] {
  const rest = SYNTHETIC_REST[side];
  const bone = (id: Parameters<typeof sideBone>[0]) => sideBone(id, side);
  return [
    {
      from: rest.clavicle,
      to: rest.shoulder,
      radius: 0.04,
      weighting: (t) => [
        [centreBone('chest'), 1 - t],
        [bone('clavicle'), t],
      ],
    },
    {
      from: rest.shoulder,
      to: rest.elbow,
      radius: 0.045,
      weighting: (t) => [
        [bone('clavicle'), 0.2 * (1 - t)],
        [bone('scapula'), 0.2 * (1 - t)],
        [bone('upperArmRoot'), 0.6 * (1 - t)],
        [bone('upperArm'), t],
      ],
    },
    {
      from: rest.elbow,
      to: rest.wrist,
      radius: 0.035,
      weighting: pair(bone('forearmRoot'), bone('forearm')),
    },
    { from: rest.wrist, to: rest.fingertip, radius: 0.03, weighting: () => [[bone('hand'), 1]] },
    {
      from: rest.hip,
      to: rest.knee,
      radius: 0.07,
      weighting: (t) => [
        [centreBone('pelvis'), 0.5 * (1 - t)],
        [bone('thigh'), 1 - 0.5 * (1 - t)],
      ],
    },
    { from: rest.knee, to: rest.ankle, radius: 0.05, weighting: pair(bone('thigh'), bone('shin')) },
    {
      from: rest.ankle,
      to: rest.toeTip,
      radius: 0.04,
      weighting: pair(bone('shin'), bone('foot')),
    },
  ];
}

const TRUNK_BONES = [
  centreBone('pelvis'),
  centreBone('spineLow'),
  centreBone('spineMid'),
  centreBone('chest'),
] as const;

function trunkWeighting(t: number): readonly Influence[] {
  const knots = TRUNK_BONES.length - 1;
  const at = Math.min(Math.floor(t * knots), knots - 1);
  const share = t * knots - at;
  return [
    [TRUNK_BONES[at], 1 - share],
    [TRUNK_BONES[at + 1], share],
  ];
}

const CENTRE_CHAINS: readonly Chain[] = [
  { from: [-0.6, 0, 0], to: [0.1, 0, 0], radius: 0.1, weighting: trunkWeighting, centred: true },
  {
    from: [0.1, 0, 0],
    to: [0.34, 0, 0],
    radius: 0.07,
    weighting: pair(centreBone('neck'), centreBone('head')),
    centred: true,
  },
];

class Builder {
  readonly positions: number[] = [];
  readonly joints: number[] = [];
  readonly weights: number[] = [];
  readonly triangles: number[] = [];

  get count(): number {
    return this.positions.length / 3;
  }

  add(position: Vector3, influences: readonly Influence[]): number {
    const index = this.count;
    this.positions.push(position.x, position.y, position.z);
    for (let i = 0; i < INFLUENCES; i++) {
      const [bone, weight] = influences[i] ?? [influences[0][0], 0];
      this.joints.push(bone);
      this.weights.push(weight);
    }
    return index;
  }
}

function ringBasis(axis: Vector3): [Vector3, Vector3] {
  const reference = Math.abs(axis.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
  const u = new Vector3().crossVectors(axis, reference).normalize();
  return [u, new Vector3().crossVectors(axis, u).normalize()];
}

function emitRing(
  builder: Builder,
  centre: Vector3,
  basis: [Vector3, Vector3],
  radius: number,
  influences: readonly Influence[],
): number[] {
  return Array.from({ length: RING_POINTS }, (_, k) => {
    const angle = (2 * Math.PI * k) / RING_POINTS;
    const point = centre
      .clone()
      .addScaledVector(basis[0], radius * Math.cos(angle))
      .addScaledVector(basis[1], radius * Math.sin(angle));
    return builder.add(point, influences);
  });
}

function emitChain(builder: Builder, chain: Chain, rings: number): void {
  const from = new Vector3(...chain.from);
  const to = new Vector3(...chain.to);
  const basis = ringBasis(to.clone().sub(from).normalize());
  let previous: number[] | null = null;
  for (let r = 0; r < rings; r++) {
    const t = r / (rings - 1);
    const centre = from.clone().lerp(to, t);
    const ring = emitRing(builder, centre, basis, chain.radius, chain.weighting(t));
    if (previous) stitch(builder, previous, ring);
    previous = ring;
  }
}

function stitch(builder: Builder, a: readonly number[], b: readonly number[]): void {
  for (let k = 0; k < RING_POINTS; k++) {
    const next = (k + 1) % RING_POINTS;
    builder.triangles.push(a[k], b[k], a[next], a[next], b[k], b[next]);
  }
}

function mirrorChain(chain: Chain): Chain {
  return {
    ...chain,
    from: mirrorTriple(chain.from),
    to: mirrorTriple(chain.to),
    weighting: (t) => chain.weighting(t).map(([bone, weight]) => [mirrorBone(bone), weight]),
  };
}

function keyOf(x: number, y: number, z: number): string {
  return [x, y, z].map((value) => Math.round(value * RESOLUTION) + 0).join(',');
}

function mirrorIndices(positions: readonly number[]): Int32Array {
  const count = positions.length / 3;
  const lookup = new Map<string, number>();
  for (let v = 0; v < count; v++) {
    lookup.set(keyOf(positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]), v);
  }
  return Int32Array.from({ length: count }, (_, v) => {
    const found = lookup.get(keyOf(positions[3 * v], positions[3 * v + 1], -positions[3 * v + 2]));
    if (found === undefined) throw new Error(`no mirror for vertex ${v}`);
    return found;
  });
}

function emptySlots(surface: Uint16Array): Record<SlotId, Uint16Array> {
  return Object.fromEntries(
    SLOT_IDS.map((id) => [id, id === 'leg' ? surface : new Uint16Array(0)]),
  ) as Record<SlotId, Uint16Array>;
}

export function buildSyntheticMesh(rings: number): SyntheticMesh {
  const builder = new Builder();
  const chains = [
    ...CENTRE_CHAINS,
    ...sideChains('right'),
    ...sideChains('right').map(mirrorChain),
  ];
  chains.forEach((chain) => emitChain(builder, chain, rings));
  const surfaceCount = builder.count;

  const marker = (side: 'right' | 'left', key: keyof RestSide, bones: readonly number[]) => {
    const at = SYNTHETIC_REST[side][key] as Triple;
    return builder.add(
      new Vector3(...at),
      bones.map((bone) => [bone, 1 / bones.length] as const),
    );
  };
  const bones = (...ids: Parameters<typeof sideBone>[0][]) =>
    ids.map((id) => sideBone(id, 'right'));
  const markers = {
    elbow: marker('right', 'elbow', bones('upperArm', 'upperArmRoot', 'forearmRoot', 'forearm')),
    wrist: marker('right', 'wrist', bones('forearmRoot', 'forearm', 'hand')),
    fingertip: marker('right', 'fingertip', bones('hand')),
    knee: marker('right', 'knee', bones('thigh', 'shin')),
    ankle: marker('right', 'ankle', bones('shin', 'foot')),
    toeTip: marker('right', 'toeTip', bones('foot')),
  };

  const forearmCentre = new Vector3(...RIGHT.elbow).lerp(new Vector3(...RIGHT.wrist), 0.5);
  const axis = new Vector3(...RIGHT.wrist).sub(new Vector3(...RIGHT.elbow)).normalize();
  const forearmRing = emitRing(builder, forearmCentre, ringBasis(axis), FOREARM_RING_RADIUS, [
    [sideBone('forearmRoot', 'right'), 0.5],
    [sideBone('forearm', 'right'), 0.5],
  ]);

  const mesh: SkinMesh = {
    vertexCount: builder.count,
    positions: Float32Array.from(builder.positions),
    joints: Uint8Array.from(builder.joints),
    weights: Float32Array.from(builder.weights),
    slots: emptySlots(Uint16Array.from(builder.triangles)),
    rest: SYNTHETIC_REST,
  };
  return {
    mesh,
    mirrorOf: mirrorIndices(builder.positions.slice(0, 3 * surfaceCount)),
    surfaceCount,
    markers,
    forearmRing,
  };
}
