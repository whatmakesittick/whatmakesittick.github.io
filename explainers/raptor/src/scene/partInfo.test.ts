import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(21);
  });

  it('ranks every part exactly once, the chamber first and the booster last', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('chamber');
    expect(LABEL_PRIORITY.at(-1)).toBe('booster');
  });

  it('ranks the solid parts above the flow streams', () => {
    const firstStream = LABEL_PRIORITY.indexOf('liquidOxygen');
    (['oxygenPump', 'methanePump', 'injector', 'throat', 'gimbal'] as const).forEach((id) =>
      expect(LABEL_PRIORITY.indexOf(id), id).toBeLessThan(firstStream),
    );
  });

  it('labels the oxygen side on the viewer left and the methane side on the right', () => {
    (
      ['oxygenInlet', 'oxygenPump', 'oxygenPreburner', 'liquidOxygen', 'oxygenRichGas'] as const
    ).forEach((id) => expect(PART_INFO[id].side, id).toBe('left'));
    (
      [
        'methaneInlet',
        'methanePump',
        'methanePreburner',
        'liquidMethane',
        'methaneRichGas',
      ] as const
    ).forEach((id) => expect(PART_INFO[id].side, id).toBe('right'));
    (['actuators', 'throat', 'plume'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('left'),
    );
  });
});
