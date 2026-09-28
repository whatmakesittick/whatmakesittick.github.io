import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { PRESETS } from '../state';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(24);
  });

  it('ranks every part exactly once, the panel first and the roof last', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('panel');
    expect(LABEL_PRIORITY.at(-1)).toBe('roof');
  });

  it('ranks the parts the overview pins above the minor parts', () => {
    PRESETS.overview.labels
      .filter((id) => id !== 'roof')
      .forEach((id) => expect(LABEL_PRIORITY.indexOf(id), id).toBeLessThan(13));
  });

  it('labels the west side parts on the left and the rest on the right', () => {
    (['sun', 'roof', 'frame', 'junctionBox', 'meter', 'rearContact'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('left'),
    );
    (['panel', 'inverter', 'emitter', 'bypassDiode', 'acCable'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('right'),
    );
  });
});
