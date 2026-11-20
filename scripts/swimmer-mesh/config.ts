export const SOURCE_REPOSITORY = 'makehumancommunity/makehuman';
export const SOURCE_COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
export const DATA_ROOT = 'makehuman/data';

export const OUTPUT_PATH =
  'explainers/freestyle-swim/src/scene/parts/swimmer/skin/bodyMesh.data.ts';
export const BODY_GROUP = 'body';
export const BODY_HEIGHT = 1.88;

const MUSCLE_BLEND = { minmuscle: 0, averagemuscle: 0.4, maxmuscle: 0.6 };
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
  { path: 'armslegs/%-upperarm-muscle-incr', weight: 0.5 },
  { path: 'armslegs/%-upperarm-shoulder-muscle-incr', weight: 0.7 },
  { path: 'armslegs/%-lowerarm-muscle-incr', weight: 0.3 },
  { path: 'armslegs/%-lowerleg-muscle-incr', weight: 0.3 },
  { path: 'armslegs/%-upperleg-muscle-incr', weight: 0.2 },
];

const CENTRE_DETAIL_TARGETS: WeightedTarget[] = [
  { path: 'torso/torso-vshape-incr', weight: 0.8 },
  { path: 'torso/torso-muscle-dorsi-incr', weight: 0.7 },
  { path: 'torso/torso-muscle-pectoral-incr', weight: 0.5 },
  { path: 'measure/measure-shoulder-dist-incr', weight: 0.4 },
  { path: 'measure/measure-waist-circ-decr', weight: 0.4 },
  { path: 'stomach/stomach-pregnant-decr', weight: 0.6 },
  { path: 'hip/hip-scale-horiz-decr', weight: 0.3 },
];

export function targetTable(): WeightedTarget[] {
  const sided = SIDED_DETAIL_TARGETS.flatMap((target) =>
    ['l', 'r'].map((side) => ({ path: target.path.replace('%', side), weight: target.weight })),
  );
  return [...blendedBodyTargets(), ...RACE_TARGETS, ...CENTRE_DETAIL_TARGETS, ...sided].filter(
    (target) => target.weight > 0,
  );
}

export const SLOT_KEEP = {
  hand: 0.33,
  forearm: 0.35,
  upperArm: 0.35,
  chest: 0.35,
  abdomen: 0.25,
  jammers: 0.3,
  legSuit: 0.15,
  leg: 0.2,
  face: 0.33,
  cap: 0.3,
  capStripe: 0.3,
} as const;
