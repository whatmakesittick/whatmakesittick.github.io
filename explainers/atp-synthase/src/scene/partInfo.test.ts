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

  it('ranks the rotor first and the extra motors last', () => {
    expect(LABEL_PRIORITY[0]).toBe('cRing');
    expect(LABEL_PRIORITY.at(-1)).toBe('neighbourMotors');
    PRESETS.overview.labels
      .filter((id) => id !== 'membrane')
      .forEach((id) => expect(LABEL_PRIORITY.indexOf(id), id).toBeLessThan(5));
  });

  it('labels the pumps and the spaces on the left, where the pumps stand', () => {
    (['pumps', 'electrons', 'oxygen', 'matrix', 'intermembraneSpace'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('left'),
    );
  });

  it('labels the loose seat and its molecules on the left and the other seats on the right', () => {
    (['looseSite', 'adpPhosphate', 'cRing', 'alphaSubunits', 'protons'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('left'),
    );
    (['openSite', 'tightSite', 'atp', 'subunitA', 'peripheralStalk'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('right'),
    );
  });
});
