import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import type { AssemblyState } from '../ids';
import { strokeAt } from '../model';
import { DEFAULT_VIEW } from './store';
import {
  armGapText,
  createAssemblyState,
  effectiveKick,
  strokeReading,
  toAssemblyState,
} from './derived';
import type { AssemblySource } from './derived';

const SOURCE: AssemblySource = {
  phase: 300,
  pace: 'middle',
  kickOverride: null,
  breathing: 'right',
  headUp: false,
  playing: true,
  view: { ...DEFAULT_VIEW, forces: true },
};

describe('derived swim state', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve({}) }));

  it('uses the pace default kick until the reader picks one', () => {
    expect(effectiveKick({ pace: 'easy', kickOverride: null })).toBe('two');
    expect(effectiveKick({ pace: 'sprint', kickOverride: null })).toBe('six');
    expect(effectiveKick({ pace: 'easy', kickOverride: 'six' })).toBe('six');
  });

  it('reads the stroke with the effective kick', () => {
    const reading = strokeReading({ ...SOURCE, pace: 'easy' });
    expect(reading).toEqual(
      strokeAt(300, { pace: 'easy', kick: 'two', breathing: 'right', headUp: false }),
    );
    expect(strokeReading({ ...SOURCE, pace: 'easy' })).toBe(reading);
  });

  it('builds the assembly state into a reusable buffer', () => {
    const target = createAssemblyState(SOURCE);
    const same = toAssemblyState({ ...SOURCE, headUp: true }, 520, false, target);
    expect(same).toBe(target);
    expect(target).toMatchObject({
      phase: 520,
      playing: false,
      pace: 'middle',
      kick: 'six',
      breathing: 'right',
      headUp: true,
      dragFactor: 3,
    });
    expect(target.reading.units).toBe(520);
    expect(target.entrySplash).toEqual(target.reading.entrySplash);
    expect(target.view).toEqual(SOURCE.view);
    const buffer: AssemblyState = createAssemblyState(SOURCE);
    expect(buffer.view).not.toBe(SOURCE.view);
  });

  it('describes the arm gap per pace', () => {
    expect(armGapText('easy')).toEqual({
      key: 'chapters.drag.gapValue',
      params: { percent: '7.6', seconds: '0.13' },
    });
    expect(armGapText('sprint')).toEqual({
      key: 'chapters.drag.overlapValue',
      params: { percent: '3.8', seconds: '0.04' },
    });
  });
});
