export const SOURCE_REPOSITORY = 'makehumancommunity/makehuman';
export const SOURCE_COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
export const DATA_ROOT = 'makehuman/data';

export const OUTPUT_PATH =
  'explainers/freestyle-swim/src/scene/parts/swimmer/skin/bodyMesh.data.ts';
export const BODY_GROUP = 'body';
export const BODY_HEIGHT = 1.902;

const MUSCLE_BLEND = { minmuscle: 0.1, averagemuscle: 0.55, maxmuscle: 0.35 };
const WEIGHT_BLEND = { minweight: 0.3, averageweight: 0.7, maxweight: 0 };
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
  { path: 'armslegs/%-upperarm-muscle-incr', weight: 0.3 },
  { path: 'armslegs/%-lowerarm-muscle-incr', weight: 0.3 },
  { path: 'armslegs/%-lowerleg-muscle-incr', weight: 0.3 },
  { path: 'armslegs/%-hand-scale-decr', weight: 0.252 },
  { path: 'armslegs/%-foot-scale-incr', weight: 0.249 },
  { path: 'armslegs/%-upperleg-muscle-incr', weight: 0.2 },
];

const CENTRE_DETAIL_TARGETS: WeightedTarget[] = [
  { path: 'torso/torso-vshape-incr', weight: 0.3 },
  { path: 'torso/torso-muscle-dorsi-incr', weight: 0.3 },
  { path: 'torso/torso-muscle-pectoral-incr', weight: 0.5 },
  { path: 'measure/measure-waist-circ-decr', weight: 0.4 },
  { path: 'stomach/stomach-pregnant-decr', weight: 0.6 },
  { path: 'measure/measure-shoulder-dist-decr', weight: 0.349 },
  { path: 'measure/measure-upperarm-length-incr', weight: 1.207 },
  { path: 'measure/measure-lowerarm-length-decr', weight: 0.116 },
  { path: 'measure/measure-upperleg-height-incr', weight: 0.153 },
  { path: 'torso/torso-scale-vert-incr', weight: 0.673 },
  { path: 'torso/torso-scale-horiz-decr', weight: 0.881 },
  { path: 'hip/hip-scale-horiz-decr', weight: 0.914 },
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
    upperArm: 0.76,
    chest: 0.66,
    abdomen: 0.4,
    jammers: 0.67,
    legSuit: 0.3,
    leg: 0.375,
    face: 0.145,
    cap: 0.4,
    capStripe: 0.3,
  },
  total: 3900,
} as const;
