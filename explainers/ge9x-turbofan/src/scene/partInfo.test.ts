import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part info', () => {
  it('ranks every part once, the fan first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('fanBlades');
  });

  it('labels every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(PART_INFO.fanBlades.side).toBe('left');
    expect(PART_INFO.hotStream.side).toBe('right');
  });
});
