import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
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

  it('ranks the parts each chapter names above the rest', () => {
    const named = new Set(Object.values(PRESETS).flatMap((preset) => preset.labels));
    const lastNamed = Math.max(...[...named].map((id) => LABEL_PRIORITY.indexOf(id)));
    const firstOther = LABEL_PRIORITY.findIndex((id) => !named.has(id));
    expect(lastNamed).toBeLessThan(firstOther);
  });
});
