import { describe, expect, it } from 'vitest';
import type { AssemblyState } from '../ids';
import {
  DAMPER_LIFT_MAX_MM,
  MOMENTS,
  SHIFT_MM,
  actionPoseAt,
  cycleMs,
  harpsichordPoseAt,
  strokeReadingAt,
  uprightPoseAt,
  uprightRestOffsetMm,
} from '../model';
import { createAssemblyState, createLiveReader, liveReading, writeAssemblyState } from './derived';
import type { AssemblySource, LiveSource } from './derived';
import { DEFAULT_VIEW } from './store';

const AT_REST: LiveSource = { phase: 0, touch: 'medium', pedal: 'none', register: 'middle' };
const MID_CYCLE = 500;

function source(changes: Partial<AssemblySource> = {}): AssemblySource {
  return {
    ...AT_REST,
    playing: true,
    compare: 'grand',
    view: { ...DEFAULT_VIEW },
    ...changes,
  };
}

describe('live reading', () => {
  it('reads the frozen stroke and action models', () => {
    const reading = liveReading({ ...AT_REST, phase: MID_CYCLE });
    expect(reading.stroke).toEqual(strokeReadingAt(MID_CYCLE, 'medium', 'none', 'middle'));
    expect(reading.action).toEqual(actionPoseAt(MID_CYCLE, 'medium', 'none', 'middle'));
    expect(reading.realMs).toBe(reading.stroke.realMs);
    expect(reading.cycleMs).toBe(cycleMs('medium', 'middle'));
  });

  it('follows the touch and the register', () => {
    expect(liveReading({ ...AT_REST, touch: 'hard' }).cycleMs).toBeLessThan(
      liveReading(AT_REST).cycleMs,
    );
    expect(liveReading({ ...AT_REST, register: 'bass' }).cycleMs).toBeGreaterThan(
      liveReading(AT_REST).cycleMs,
    );
  });

  it('caches the reading while the four inputs stay the same', () => {
    const read = createLiveReader();
    const reading = read(AT_REST);
    expect(read({ ...AT_REST })).toBe(reading);
    expect(read({ ...AT_REST, pedal: 'sustain' })).not.toBe(reading);
    expect(read({ ...AT_REST, phase: MID_CYCLE })).toEqual(
      liveReading({ ...AT_REST, phase: MID_CYCLE }),
    );
  });

  it('keeps one cache per reader', () => {
    const first = createLiveReader();
    const second = createLiveReader();
    const reading = first(AT_REST);
    expect(second(AT_REST)).not.toBe(reading);
    expect(second(AT_REST)).toEqual(reading);
    expect(first(AT_REST)).toBe(reading);
  });
});

describe('assembly state', () => {
  it('moves on from the key at rest by mid cycle', () => {
    const rest = createAssemblyState(source());
    const mid = createAssemblyState(source({ phase: MID_CYCLE }));
    expect(rest.stroke.realMs).toBe(0);
    expect(mid.stroke.realMs).toBeGreaterThan(rest.stroke.realMs);
    expect(rest.action.hammerRiseMm).toBe(0);
    expect(mid.action.hammerRiseMm).toBeGreaterThan(rest.action.hammerRiseMm);
    expect(rest.action.hammerSpeedMs).toBe(0);
    expect(mid.action.hammerSpeedMs).toBeLessThan(0);
    expect(rest.stroke.levelDb).toBeNull();
    expect(mid.stroke.levelDb).toEqual(expect.any(Number));
    expect(mid.stroke.phase).toBe('strike');
  });

  it('fills the ghosts from the upright and harpsichord models', () => {
    const state = createAssemblyState(source({ phase: MOMENTS.strike, touch: 'hard' }));
    expect(state.upright).toEqual(uprightPoseAt(MOMENTS.strike, 'hard', 'none', 'middle'));
    expect(state.harpsichord).toEqual(harpsichordPoseAt(MOMENTS.strike, 'hard', 'middle'));
  });

  it('carries una corda into the action, the upright and the strings struck', () => {
    const state = createAssemblyState(source({ phase: MID_CYCLE, pedal: 'unaCorda' }));
    expect(state.pedal).toBe('unaCorda');
    expect(state.action.shiftMm).toBe(SHIFT_MM);
    expect(SHIFT_MM).toBeGreaterThan(0);
    expect(state.upright.restOffsetMm).toBe(uprightRestOffsetMm('unaCorda'));
    expect(state.upright.restOffsetMm).toBeGreaterThan(0);
    expect(state.stroke.stringsStruck).toBe(state.stroke.strings - 1);
  });

  it('carries sustain into the dampers and the sympathetic strings', () => {
    const state = createAssemblyState(source({ phase: MID_CYCLE, pedal: 'sustain' }));
    expect(state.action.damperState).toBe('pedal');
    expect(state.action.damperLiftMm).toBe(DAMPER_LIFT_MAX_MM);
    expect(state.upright.damperLiftMm).toBe(DAMPER_LIFT_MAX_MM);
    expect(state.stroke.sympathyShare).toBeGreaterThan(0);
    const held = createAssemblyState(source({ phase: MID_CYCLE }));
    expect(held.action.shiftMm).toBe(0);
    expect(held.stroke.sympathyShare).toBe(0);
  });

  it('fills the scalars and the view from the store', () => {
    const view = { ...DEFAULT_VIEW, wave: true };
    const state = createAssemblyState(
      source({ playing: false, register: 'treble', compare: 'upright', touch: 'soft', view }),
    );
    expect(state).toMatchObject({
      phase: 0,
      playing: false,
      touch: 'soft',
      pedal: 'none',
      register: 'treble',
      compare: 'upright',
    });
    expect(state.view).toEqual(view);
    expect(state.view).not.toBe(view);
  });

  it('writes the next frame into the same objects', () => {
    const target: AssemblyState = createAssemblyState(source());
    const { stroke, action, upright, harpsichord, view } = target;
    const result = writeAssemblyState(
      source({ phase: MID_CYCLE, register: 'bass', view: { ...DEFAULT_VIEW, inset: true } }),
      target,
    );
    expect(result).toBe(target);
    expect(target.stroke).toBe(stroke);
    expect(target.action).toBe(action);
    expect(target.upright).toBe(upright);
    expect(target.harpsichord).toBe(harpsichord);
    expect(target.view).toBe(view);
    expect(target).toMatchObject({ phase: MID_CYCLE, register: 'bass' });
    expect(target.stroke.phase).toBe('strike');
    expect(target.view.inset).toBe(true);
  });

  it('reads through the reader it is given', () => {
    const read = createLiveReader();
    const reading = read(AT_REST);
    const state = createAssemblyState(source(), read);
    expect(state.action).toEqual(reading.action);
    expect(state.action).not.toBe(reading.action);
    writeAssemblyState(source({ phase: MOMENTS.checked }), state, read);
    expect(state.stroke).toEqual(read({ ...AT_REST, phase: MOMENTS.checked }).stroke);
  });

  it('keeps the source view untouched', () => {
    const view = { ...DEFAULT_VIEW };
    const state = createAssemblyState(source({ view }));
    state.view.labels = false;
    expect(view.labels).toBe(true);
  });
});
