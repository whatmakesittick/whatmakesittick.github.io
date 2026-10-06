import { describe, expect, it } from 'vitest';
import { FIELD_IDS, TISSUE_IDS } from '../ids';
import { RELAXATION } from './tissues';

describe('tissue relaxation', () => {
  it('takes the 1.5 T and 3 T times from the facts sheet', () => {
    expect(RELAXATION.field15.whiteMatter).toEqual({ t1: 884, t2: 72 });
    expect(RELAXATION.field15.greyMatter).toEqual({ t1: 1124, t2: 95 });
    expect(RELAXATION.field15.fat).toEqual({ t1: 260, t2: 80 });
    expect(RELAXATION.field30.whiteMatter).toEqual({ t1: 1084, t2: 69 });
    expect(RELAXATION.field30.greyMatter).toEqual({ t1: 1820, t2: 99 });
    expect(RELAXATION.field30.fat).toEqual({ t1: 382, t2: 68 });
  });

  it('keeps fluid the slowest at both fields, with T2 shorter than T1 everywhere', () => {
    for (const field of FIELD_IDS) {
      expect(RELAXATION[field].fluid).toEqual({ t1: 4300, t2: 2000 });
      for (const tissue of TISSUE_IDS) {
        expect(RELAXATION[field][tissue].t2).toBeLessThan(RELAXATION[field][tissue].t1);
      }
    }
  });
});
