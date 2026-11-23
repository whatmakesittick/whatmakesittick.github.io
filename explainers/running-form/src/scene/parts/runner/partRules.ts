import type { PartRule } from '@core/figure/body/figureBody';

export const PART_RULES: readonly PartRule[] = [
  [/_(foot|talocrural|subtalar|transversetarsal|ball)$/, 'shoe'],
  [/_lowleg/, 'shin'],
  [/_upleg/, 'thigh'],
  [/^root$/, 'pelvis'],
  [/^c_spine|_clavicle$/, 'trunk'],
  [/_(uparm|lowarm|wrist|pinky|ring|middle|index|thumb)/, 'arm'],
  [/^c_(neck|head|jaw|teeth|tongue)|_eye/, 'head'],
];
