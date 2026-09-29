import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { PRESETS } from '../state';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(26);
  });

  it('ranks every part exactly once, the left ventricle first and the blood last', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('leftVentricle');
    expect(LABEL_PRIORITY.at(-1)).toBe('arterialBlood');
  });

  it('ranks the chambers and valves the chapters pin above the minor parts', () => {
    [...PRESETS.chambers.labels, ...PRESETS.valves.labels]
      .filter((id) => id !== 'septum' && id !== 'chordae')
      .forEach((id) => expect(LABEL_PRIORITY.indexOf(id), id).toBeLessThan(10));
  });

  it('labels the right heart on the viewer left and the left heart on the viewer right', () => {
    (
      ['rightAtrium', 'rightVentricle', 'tricuspidValve', 'superiorVenaCava', 'sinusNode'] as const
    ).forEach((id) => expect(PART_INFO[id].side, id).toBe('left'));
    (['leftAtrium', 'leftVentricle', 'mitralValve', 'aorta', 'pulmonaryVeins'] as const).forEach(
      (id) => expect(PART_INFO[id].side, id).toBe('right'),
    );
  });
});
