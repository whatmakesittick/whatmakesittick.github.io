import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, PART_IDS, PRESET_IDS, VIEW_IDS } from '../ids';
import { MOMENTS } from '../model';
import { PRESETS } from './presets';

describe('thruster car presets', () => {
  it('defines one preset per chapter, each with its own camera', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([...CAMERA_VIEW_IDS]);
    PRESET_IDS.forEach((id) => expect(CAMERA_VIEW_IDS, id).toContain(PRESETS[id].camera));
  });

  it('names only known parts in labels and highlights', () => {
    PRESET_IDS.forEach((id) => {
      [...PRESETS[id].labels, ...PRESETS[id].highlight].forEach((part) =>
        expect(PART_IDS, `${id} ${part}`).toContain(part),
      );
    });
  });

  it('slows the nozzle and flip chapters to half speed', () => {
    PRESET_IDS.forEach((id) =>
      expect(PRESETS[id].speed, id).toBe(['nozzle', 'flip'].includes(id) ? 0.5 : 1),
    );
  });

  it('pauses on the tank and the firing nozzles and plays the rest from its start', () => {
    expect(PRESETS.tank.pauseAt).toBe(0);
    expect(PRESETS.nozzle.pauseAt).toBe(1);
    expect(PRESETS.boost.startAt).toBe(0);
    expect(PRESETS.hop.startAt).toBe(2);
    expect(PRESETS.flip.startAt).toBe(MOMENTS.leavesRamp);
    expect(PRESETS.limits.startAt).toBe(0);
  });

  it('sets every view flag but the labels', () => {
    PRESET_IDS.forEach((id) => {
      expect(Object.keys(PRESETS[id].view).sort(), id).toEqual(
        VIEW_IDS.filter((flag) => flag !== 'labels').sort(),
      );
    });
    expect(PRESET_IDS.filter((id) => PRESETS[id].view.tank)).toEqual(['tank', 'limits']);
    expect(PRESET_IDS.filter((id) => PRESETS[id].view.forces)).toEqual(['nozzle', 'boost', 'flip']);
  });

  it('dims nothing in the limits chapter', () => {
    expect(PRESETS.limits.highlight).toEqual([]);
    PRESET_IDS.filter((id) => id !== 'limits').forEach((id) =>
      expect(PRESETS[id].highlight.length, id).toBeGreaterThan(0),
    );
  });
});
