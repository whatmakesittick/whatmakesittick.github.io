import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, PART_IDS, PRESET_IDS, REAR_NOZZLE_IDS, VIEW_IDS } from '../ids';
import { MOMENTS, PHASE_RANGES, nozzlesAt, phaseAt } from '../model';
import type { PhaseId, PresetId } from '../ids';
import { PRESETS } from './presets';

const START_PHASES: Readonly<Record<PresetId, PhaseId>> = {
  tank: 'sprint',
  nozzle: 'sprint',
  boost: 'sprint',
  hook: 'settle',
  flip: 'flip',
  jump: 'runUp',
  limits: 'sprint',
};

function chapterStart(id: PresetId): number {
  const { startAt, pauseAt } = PRESETS[id];
  return startAt ?? pauseAt ?? Number.NaN;
}

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
    expect(PRESETS.nozzle.pauseAt).toBe(0.5);
    expect(PRESETS.boost.startAt).toBe(0);
    expect(PRESETS.hook.startAt).toBe(2.5);
    expect(PRESETS.flip.startAt).toBe(MOMENTS.leavesRamp);
    expect(PRESETS.jump.startAt).toBe(MOMENTS.touchdown);
    expect(PRESETS.jump.startAt).toBeCloseTo(6.7, 1);
    expect(PRESETS.limits.startAt).toBe(0);
  });

  it('starts each chapter in the part of the run it explains', () => {
    PRESET_IDS.forEach((id) => expect(phaseAt(chapterStart(id)), id).toBe(START_PHASES[id]));
    const firing = nozzlesAt(chapterStart('nozzle'));
    REAR_NOZZLE_IDS.forEach((id) => expect(firing[id], id).toBeGreaterThan(0));
    expect(chapterStart('jump')).toBeLessThan(PHASE_RANGES.leap.start);
  });

  it('films the 0 to 60 run abeam, the hook wide, the roll from behind and the jump wide', () => {
    expect(PRESETS.boost.camera).toBe('boostSide');
    expect(PRESETS.hook.camera).toBe('rampWide');
    expect(PRESETS.flip.camera).toBe('flipChase');
    expect(PRESETS.jump.camera).toBe('jumpWide');
    expect(PRESETS.limits.camera).toBe('siteWide');
  });

  it('shows the ramp and its fans in the hook, the row and the jets in the jump', () => {
    expect(PRESETS.hook.view).toEqual({ nozzles: false, forces: false, tank: false, ghost: true });
    expect(PRESETS.hook.highlight).toEqual(['ramp', 'fans', 'ghostPath', 'body']);
    expect(PRESETS.hook.labels).toEqual(['ramp', 'fans', 'ghostPath', 'landingPad']);
    expect(PRESETS.jump.view).toEqual({ nozzles: true, forces: true, tank: false, ghost: true });
    expect([...PRESETS.jump.labels].sort()).toEqual(
      ['parkedRow', 'landingPad', 'cornerNozzles', 'jets', 'ghostPath'].sort(),
    );
    expect(PRESETS.jump.highlight).toEqual(
      expect.arrayContaining(['parkedRow', 'cornerNozzles', 'jets', 'ghostPath', 'body']),
    );
  });

  it('sets every view flag but the labels', () => {
    PRESET_IDS.forEach((id) => {
      expect(Object.keys(PRESETS[id].view).sort(), id).toEqual(
        VIEW_IDS.filter((flag) => flag !== 'labels').sort(),
      );
    });
    expect(PRESET_IDS.filter((id) => PRESETS[id].view.tank)).toEqual(['tank', 'limits']);
    expect(PRESET_IDS.filter((id) => PRESETS[id].view.forces)).toEqual([
      'nozzle',
      'boost',
      'flip',
      'jump',
    ]);
  });

  it('dims nothing in the limits chapter', () => {
    expect(PRESETS.limits.highlight).toEqual([]);
    PRESET_IDS.filter((id) => id !== 'limits').forEach((id) =>
      expect(PRESETS[id].highlight.length, id).toBeGreaterThan(0),
    );
  });
});
