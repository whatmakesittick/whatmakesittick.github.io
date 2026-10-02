import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { PRESETS } from '../state';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(PART_IDS.length);
  });

  it('ranks every part exactly once, the camera first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('camera');
  });

  it('labels the nose, the left motors and the ground on the left', () => {
    (
      [
        'camera',
        'videoAntenna',
        'motorFrontLeft',
        'motorRearLeft',
        'groundStation',
        'controlLink',
        'crossroads',
        'launchPad',
      ] as const
    ).forEach((id) => expect(PART_INFO[id].side, id).toBe('left'));
    (['motorFrontRight', 'motorRearRight', 'battery', 'videoLink'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('right'),
    );
  });

  it('splits the labels of the busy chapters across both sides', () => {
    (['overview', 'flight', 'link', 'power'] as const).forEach((id) => {
      const sides = PRESETS[id].labels.map((part) => PART_INFO[part].side);
      expect(sides, id).toContain('left');
      expect(sides, id).toContain('right');
    });
  });
});
