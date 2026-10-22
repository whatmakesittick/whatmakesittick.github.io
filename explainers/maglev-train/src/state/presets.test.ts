import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, PART_IDS, PRESET_IDS, VIEW_IDS } from '../ids';
import type { PhaseId, PresetId } from '../ids';
import { MOMENTS, phaseAt } from '../model';
import { PRESETS } from './presets';

const START_PHASES: Readonly<Record<PresetId, PhaseId>> = {
  ride: 'liftOff',
  float: 'liftOff',
  centre: 'cruise',
  motor: 'accelerate',
  stop: 'brake',
  compare: 'cruise',
};

function chapterStart(id: PresetId): number {
  const { startAt, pauseAt } = PRESETS[id];
  return startAt ?? pauseAt ?? Number.NaN;
}

function viewsOn(id: PresetId): readonly string[] {
  return Object.entries(PRESETS[id].view)
    .filter(([, on]) => on)
    .map(([flag]) => flag);
}

describe('maglev train presets', () => {
  it('defines one preset per chapter, each with its own camera', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([...CAMERA_VIEW_IDS]);
  });

  it('names only known parts in labels and highlights', () => {
    PRESET_IDS.forEach((id) => {
      [...PRESETS[id].labels, ...PRESETS[id].highlight].forEach((part) =>
        expect(PART_IDS, `${id} ${part}`).toContain(part),
      );
    });
  });

  it('plays the float and motor chapters slowly and the stop at four times', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].speed)).toEqual([8, 2, 8, 2, 4, 8]);
  });

  it('starts the ride and the lift at the platform, the motor just after departure, the stop near the end', () => {
    expect(PRESETS.ride.startAt).toBe(0);
    expect(PRESETS.float.startAt).toBe(0);
    expect(PRESETS.motor.startAt).toBe(70);
    expect(PRESETS.stop.startAt).toBe(880);
    PRESET_IDS.forEach((id) => expect(phaseAt(chapterStart(id)), id).toBe(START_PHASES[id]));
  });

  it('pauses the cross-section and the line-up at full speed', () => {
    expect(PRESETS.centre.pauseAt).toBe(MOMENTS.fullSpeed);
    expect(PRESETS.compare.pauseAt).toBe(MOMENTS.fullSpeed);
    expect(MOMENTS.fullSpeed).toBe(420);
    expect(PRESET_IDS.filter((id) => PRESETS[id].pauseAt !== undefined)).toEqual([
      'centre',
      'compare',
    ]);
  });

  it('sets every view flag but the labels', () => {
    PRESET_IDS.forEach((id) =>
      expect(Object.keys(PRESETS[id].view).sort(), id).toEqual(
        VIEW_IDS.filter((flag) => flag !== 'labels').sort(),
      ),
    );
  });

  it('turns on the views each chapter needs and nothing else', () => {
    expect(viewsOn('ride')).toEqual(['ghost']);
    expect(viewsOn('float')).toEqual(['gap']);
    expect(viewsOn('centre')).toEqual(['cutaway']);
    expect(viewsOn('motor')).toEqual(['wave', 'gap']);
    expect(viewsOn('stop')).toEqual(['wave']);
    expect(viewsOn('compare')).toEqual(['cutaway', 'lineUp']);
  });

  it('starts the chapter controls the table names', () => {
    expect(PRESETS.ride.start).toBeUndefined();
    expect(PRESETS.float.start).toBeUndefined();
    expect(PRESETS.centre.start).toEqual({ nudge: null });
    expect(PRESETS.motor.start).toBeUndefined();
    expect(PRESETS.stop.start).toEqual({ brakeMode: 'regen' });
    expect(PRESETS.compare.start).toEqual({ compare: 'transrapid' });
  });

  it('labels and highlights the parts of each chapter', () => {
    expect(PRESETS.ride.labels).toEqual(['train', 'guideway', 'piers', 'stations', 'ghostTrain']);
    expect(PRESETS.ride.highlight).toEqual([]);
    const lift = ['wrapArms', 'supportMagnets', 'statorPacks', 'skids', 'gapInset'];
    expect(PRESETS.float.labels).toEqual(lift);
    expect(PRESETS.float.highlight).toEqual(lift);
    const guidance = [
      'guidanceMagnets',
      'guidanceRails',
      'supportMagnets',
      'statorPacks',
      'wrapArms',
    ];
    expect(PRESETS.centre.labels).toEqual([...guidance, 'guideway']);
    expect(PRESETS.centre.highlight).toEqual(guidance);
    const motor = [
      'statorPacks',
      'travellingWave',
      'poweredSection',
      'supportMagnets',
      'feederCable',
      'gapInset',
    ];
    expect(PRESETS.motor.labels).toEqual(motor);
    expect(PRESETS.motor.highlight).toEqual(motor);
    const brake = ['skids', 'eddyBrakes', 'powerFlow', 'feederCable'];
    expect(PRESETS.stop.labels).toEqual([...brake, 'stations']);
    expect(PRESETS.stop.highlight).toEqual(brake);
    const lineUp = ['train', 'scmaglev', 'wheelRail', 'gapCallouts'];
    expect(PRESETS.compare.labels).toEqual(lineUp);
    expect(PRESETS.compare.highlight).toEqual(lineUp);
  });
});
