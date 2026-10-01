import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(7);
  });

  it('ranks every part exactly once, the probe first and the sheet marker last', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('probe');
    expect(LABEL_PRIORITY.at(-1)).toBe('sheetProbe');
  });

  it('labels the hole side on the left and the travellers on the right', () => {
    (['horizon', 'disc', 'sheetProbe'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('left'),
    );
    (['photonSphere', 'probe', 'ship', 'beacon'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('right'),
    );
  });
});
