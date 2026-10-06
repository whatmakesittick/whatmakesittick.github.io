import type { FieldId, TissueId } from '../ids';

export interface Relaxation {
  t1: number;
  t2: number;
}

export const RELAXATION: Readonly<Record<FieldId, Readonly<Record<TissueId, Relaxation>>>> = {
  field15: {
    fat: { t1: 260, t2: 80 },
    whiteMatter: { t1: 884, t2: 72 },
    greyMatter: { t1: 1124, t2: 95 },
    fluid: { t1: 4300, t2: 2000 },
  },
  field30: {
    fat: { t1: 382, t2: 68 },
    whiteMatter: { t1: 1084, t2: 69 },
    greyMatter: { t1: 1820, t2: 99 },
    fluid: { t1: 4300, t2: 2000 },
  },
};
