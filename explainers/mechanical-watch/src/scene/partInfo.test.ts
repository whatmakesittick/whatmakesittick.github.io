import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { BALANCE_CENTRE, MINUTE_WHEEL_CENTRE, WHEEL_CENTRES } from '../model';
import { PRESETS } from '../state';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(PART_IDS.length);
  });

  it('ranks every part exactly once', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
  });

  it('ranks the parts the overview names among the first and the case last', () => {
    const firstFive = LABEL_PRIORITY.slice(0, 5);
    PRESETS.overview.labels.forEach((id) =>
      expect(LABEL_PRIORITY.indexOf(id), id).toBeLessThan(10),
    );
    expect(firstFive).toContain('balanceWheel');
    expect(LABEL_PRIORITY.at(-1)).toBe('case');
  });

  it('labels the parts on the crown side on the left', () => {
    expect(BALANCE_CENTRE.x).toBeGreaterThan(0);
    expect(WHEEL_CENTRES.escapeWheel.x).toBeGreaterThan(0);
    expect(MINUTE_WHEEL_CENTRE.x).toBeGreaterThan(0);
    expect(WHEEL_CENTRES.barrel.x).toBeLessThan(0);
    (['balanceWheel', 'escapeWheel', 'palletFork', 'minuteWheel', 'centreWheel'] as const).forEach(
      (id) => expect(PART_INFO[id].side, id).toBe('right'),
    );
    (['barrel', 'thirdWheel', 'crown', 'ratchetWheel'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('left'),
    );
  });
});
