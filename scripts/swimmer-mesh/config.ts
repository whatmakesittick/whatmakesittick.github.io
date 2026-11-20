export const SOURCE_REPOSITORY = 'makehumancommunity/makehuman';
export const SOURCE_COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
export const DATA_ROOT = 'makehuman/data';

export const OUTPUT_PATH =
  'explainers/freestyle-swim/src/scene/parts/swimmer/skin/bodyMesh.data.ts';
export const BODY_GROUP = 'body';
export const BODY_HEIGHT = 1.93;

const MUSCLE_BLEND = { minmuscle: 0.15, averagemuscle: 0.7, maxmuscle: 0.15 };
const WEIGHT_BLEND = { minweight: 0.45, averageweight: 0.55, maxweight: 0 };
const RACES = ['african', 'asian', 'caucasian'];
const RACE_SHARE = 1 / RACES.length;

export interface WeightedTarget {
  readonly path: string;
  readonly weight: number;
}

function blendedBodyTargets(): WeightedTarget[] {
  const targets: WeightedTarget[] = [];
  for (const [muscle, muscleShare] of Object.entries(MUSCLE_BLEND)) {
    for (const [weight, weightShare] of Object.entries(WEIGHT_BLEND)) {
      const share = muscleShare * weightShare;
      targets.push(
        { path: `macrodetails/universal-male-young-${muscle}-${weight}`, weight: share },
        {
          path: `macrodetails/proportions/male-young-${muscle}-${weight}-idealproportions`,
          weight: share,
        },
      );
    }
  }
  return targets;
}

const RACE_TARGETS: WeightedTarget[] = RACES.map((race) => ({
  path: `macrodetails/${race}-male-young`,
  weight: RACE_SHARE,
}));

const SIDED_DETAIL_TARGETS: WeightedTarget[] = [
  { path: 'armslegs/%-upperarm-muscle-incr', weight: 0.1 },
  { path: 'armslegs/%-upperarm-fat-decr', weight: 1 },
  { path: 'armslegs/%-lowerarm-muscle-incr', weight: 0.15 },
  { path: 'armslegs/%-lowerleg-muscle-incr', weight: 0.15 },
  { path: 'armslegs/%-hand-scale-decr', weight: 0.254 },
  { path: 'armslegs/%-foot-scale-incr', weight: 0.248 },
  { path: 'armslegs/%-upperleg-muscle-incr', weight: 0.1 },
];

const CENTRE_DETAIL_TARGETS: WeightedTarget[] = [
  { path: 'torso/torso-vshape-incr', weight: 0.08 },
  { path: 'torso/torso-muscle-pectoral-incr', weight: 0.1 },
  { path: 'measure/measure-waist-circ-decr', weight: 0.4 },
  { path: 'measure/measure-upperarm-circ-decr', weight: 0.3 },
  { path: 'neck/neck-scale-vert-incr', weight: 0.5 },
  { path: 'measure/measure-neck-circ-decr', weight: 0.2 },
  { path: 'head/head-scale-horiz-decr', weight: 0.691 },
  { path: 'stomach/stomach-pregnant-decr', weight: 0.6 },
  { path: 'measure/measure-shoulder-dist-decr', weight: 0.068 },
  { path: 'measure/measure-upperarm-length-incr', weight: 1.228 },
  { path: 'measure/measure-lowerarm-length-decr', weight: 0.118 },
  { path: 'measure/measure-upperleg-height-incr', weight: 0.151 },
  { path: 'torso/torso-scale-vert-incr', weight: 0.675 },
  { path: 'torso/torso-scale-horiz-decr', weight: 0.881 },
  { path: 'hip/hip-scale-horiz-decr', weight: 0.929 },
];

export function targetTable(): WeightedTarget[] {
  const sided = SIDED_DETAIL_TARGETS.flatMap((target) =>
    ['l', 'r'].map((side) => ({ path: target.path.replace('%', side), weight: target.weight })),
  );
  return [...blendedBodyTargets(), ...RACE_TARGETS, ...CENTRE_DETAIL_TARGETS, ...sided].filter(
    (target) => target.weight > 0,
  );
}

export const SIMPLIFY_BUDGET = {
  keep: {
    hand: 0.14,
    forearm: 0.75,
    upperArm: 0.85,
    chest: 0.66,
    shoulders: 0.85,
    abdomen: 0.4,
    jammers: 0.67,
    legSuit: 0.3,
    leg: 0.42,
    face: 0.22,
    cap: 0.4,
    capStripe: 0.3,
  },
  total: 4700,
} as const;

export const MIDLINE_TOLERANCE = 0.0002;
