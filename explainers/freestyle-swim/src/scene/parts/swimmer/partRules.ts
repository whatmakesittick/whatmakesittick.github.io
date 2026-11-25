import type { PartRule } from '@core/figure/body/figureBody';

export const PART_RULES: readonly PartRule[] = [
  [/_(wrist|pinky|ring|middle|index|thumb)/, 'hand'],
  [/_lowarm/, 'forearm'],
  [/_uparm/, 'elbow'],
  [/_clavicle|c_spine[23]/, 'shoulder'],
  [/c_neck|c_head|c_jaw|c_teeth|c_tongue|_eye/, 'head'],
  [/_lowleg|_foot|_ball|_talocrural|_subtalar|_transversetarsal/, 'foot'],
  [/_upleg|^root$/, 'hips'],
];
