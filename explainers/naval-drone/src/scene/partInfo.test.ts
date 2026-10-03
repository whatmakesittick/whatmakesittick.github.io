import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { PRESETS } from '../state';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(PART_IDS.length);
  });

  it('ranks every part exactly once, the impeller first and the hull last', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('impeller');
    expect(LABEL_PRIORITY.at(-1)).toBe('hull');
  });

  it('labels the pump, the insides and the backup link on the left', () => {
    (
      [
        'waterjet',
        'engine',
        'fuelTanks',
        'electronicsBay',
        'intake',
        'duct',
        'driveShaft',
        'impeller',
        'stator',
        'wake',
        'jetStream',
        'wettedLength',
        'backupPanel',
        'backupLink',
        'groundStation',
        'companions',
        'shipRadar',
        'hull',
      ] as const
    ).forEach((id) => expect(PART_INFO[id].side, id).toBe('left'));
    (['nozzle', 'steeringNozzle', 'satLink', 'satellite', 'ship', 'cameraDome'] as const).forEach(
      (id) => expect(PART_INFO[id].side, id).toBe('right'),
    );
  });

  it('splits the labels of the busy chapters across both sides', () => {
    (['overview', 'jet', 'link'] as const).forEach((id) => {
      const sides = PRESETS[id].labels.map((part) => PART_INFO[part].side);
      expect(sides, id).toContain('left');
      expect(sides, id).toContain('right');
    });
  });
});
