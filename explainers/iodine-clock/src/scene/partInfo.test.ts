import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';
import { UNDIMMED_PARTS } from './sceneOptions';

describe('part info', () => {
  it('labels every part from its locale key', () => {
    expect(Object.keys(PART_INFO)).toEqual([...PART_IDS]);
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
  });

  it('ranks every part once', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
  });

  it('puts the mixing beaker left and the pour right, and never dims the liquid', () => {
    expect(PART_INFO.mixingBeaker.side).toBe('left');
    expect(PART_INFO.pourBeaker.side).toBe('right');
    expect(PART_INFO.amylose.side).toBe('left');
    expect(PART_INFO.water.side).toBe('right');
    expect(UNDIMMED_PARTS).toEqual(['mixture', 'water']);
  });
});
