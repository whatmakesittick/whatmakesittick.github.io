import { describe, expect, it } from 'vitest';
import { PRESET_IDS, PRESET_SETTINGS } from '../ids';
import type { PartId } from '../ids';
import { DEFAULT_SPEED, SLOW_SPEED } from '../model';
import { PRESETS } from './presets';

describe('chainsaw presets', () => {
  it('defines one preset per chapter, the engine one slower', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
    PRESET_IDS.forEach((id) =>
      expect(PRESETS[id].speed, id).toBe(id === 'engine' ? SLOW_SPEED : DEFAULT_SPEED),
    );
  });

  it('frames each chapter with its own camera', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([
      'sawSide',
      'cylinderCut',
      'carburettor',
      'starterSide',
      'clutchSprocket',
      'barChain',
      'kickbackWide',
    ]);
  });

  it('opens the cutaway in the engine, fuel, starting, clutch and kickback chapters', () => {
    const cut = PRESET_IDS.filter((id) => PRESETS[id].view.cutaway);
    expect(cut).toEqual(['engine', 'fuel', 'starting', 'clutch', 'kickback']);
    expect(PRESET_IDS.filter((id) => PRESETS[id].view.zone)).toEqual(['kickback']);
  });

  it('idles the fuel, starting and clutch chapters and runs the others at full throttle', () => {
    PRESET_IDS.forEach((id) =>
      expect(PRESETS[id].start?.throttle, id).toBe(
        ['fuel', 'starting', 'clutch'].includes(id) ? 0 : 1,
      ),
    );
    expect(PRESETS.kickback.start?.brake).toBe(false);
  });

  it('never pauses and shows the log only where the bar cuts', () => {
    PRESET_IDS.forEach((id) => expect(PRESETS[id].pauseAt, id).toBeUndefined());
    expect(PRESET_SETTINGS.saw).toBe('cutting');
  });

  it('never labels the log or the handles', () => {
    const unlabelled: readonly PartId[] = ['log', 'rearHandle', 'frontHandle'];
    PRESET_IDS.forEach((id) =>
      unlabelled.forEach((part) => expect(PRESETS[id].labels, `${id} ${part}`).not.toContain(part)),
    );
    expect(PRESETS.starting.labels).toContain('fuelCap');
  });

  it('highlights every label it shows in the engine, fuel and chain chapters', () => {
    (['engine', 'fuel', 'chain'] as const).forEach((id) =>
      PRESETS[id].labels
        .filter((part) => part !== 'chips')
        .forEach((part) => expect(PRESETS[id].highlight, `${id} ${part}`).toContain(part)),
    );
    expect(PRESETS.saw.highlight).toEqual([]);
  });

  it('keeps the housing and everything round the starter bright in the starting chapter', () => {
    const lit: readonly PartId[] = [
      'powerhead',
      'starter',
      'starterGrip',
      'starterRope',
      'fuelCap',
      'oilCap',
      'primerBulb',
      'chokeLever',
      'decompressionValve',
    ];
    lit.forEach((part) => expect(PRESETS.starting.highlight, part).toContain(part));
  });

  it('keeps the chain bright around the sprocket in the clutch chapter', () => {
    expect(PRESETS.clutch.highlight).toContain('chain');
  });
});
