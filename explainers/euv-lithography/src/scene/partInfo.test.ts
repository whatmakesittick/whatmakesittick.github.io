import { describe, expect, it } from 'vitest';
import { LEFT_LABEL_PARTS, PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('euv part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO).sort()).toEqual([...PART_IDS].sort());
  });

  it('puts the source side parts on the left and the rest on the right', () => {
    PART_IDS.forEach((id) =>
      expect(PART_INFO[id].side, id).toBe(LEFT_LABEL_PARTS.includes(id) ? 'left' : 'right'),
    );
  });

  it('ranks every part once, the flash first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('flash');
  });
});
