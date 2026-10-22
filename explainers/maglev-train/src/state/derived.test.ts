import { describe, expect, it } from 'vitest';
import type { AssemblyState, OnboardId, PhaseId, PowerFlowId, TopSpeedId } from '../ids';
import { LINE_M, MOMENTS, PROFILES, ghostAt, tripSeconds } from '../model';
import { createAssemblyState, createLiveReader, liveReading, writeAssemblyState } from './derived';
import type { AssemblySource, LiveSource } from './derived';
import { DEFAULT_VIEW } from './store';

interface ExpectedReading {
  topSpeed: TopSpeedId;
  units: number;
  phase: PhaseId;
  realSeconds: number;
  distance: number;
  speedKmh: number;
  gapMm: number;
  onSkids: boolean;
  waveOn: boolean;
  reversed: boolean;
  hz: number;
  flow: PowerFlowId;
  onboard: OnboardId;
  ghostKm: number;
}

const FAST: LiveSource = { phase: 0, topSpeed: 'kmh430', brakeMode: 'regen' };

const STANDING = { speedKmh: 0, waveOn: false, reversed: false, hz: 0, flow: 'none' } as const;
const ON_SKIDS = { ...STANDING, gapMm: 30, onSkids: true, onboard: 'rails' } as const;
const FLOATING = { gapMm: 10, onSkids: false } as const;
const AT_PLATFORM = { phase: 'liftOff', distance: 0, ghostKm: 0 } as const;
const AT_AIRPORT = { phase: 'settle', distance: LINE_M } as const;
const CRUISING = { phase: 'cruise', reversed: false, flow: 'drive' } as const;
const BRAKING = { phase: 'brake', reversed: true, flow: 'regen' } as const;
const MOVING = { ...FLOATING, waveOn: true, onboard: 'generator' } as const;
const LIFTED = { ...FLOATING, ...STANDING, onboard: 'rails' } as const;

const READINGS: readonly ExpectedReading[] = [
  { topSpeed: 'kmh430', units: 0, ...AT_PLATFORM, ...ON_SKIDS, realSeconds: 0 },
  { topSpeed: 'kmh430', units: 45, ...AT_PLATFORM, ...LIFTED, realSeconds: 4.5 },
  {
    topSpeed: 'kmh430',
    units: 420,
    ...CRUISING,
    ...MOVING,
    realSeconds: 229.2,
    distance: 15461,
    speedKmh: 430,
    hz: 231.5,
    ghostKm: 3.09,
  },
  {
    topSpeed: 'kmh430',
    units: 600,
    ...BRAKING,
    ...MOVING,
    realSeconds: 259.0,
    distance: 19025,
    speedKmh: 430,
    hz: 231.5,
    ghostKm: 3.97,
  },
  {
    topSpeed: 'kmh430',
    units: 970,
    ...AT_AIRPORT,
    ...ON_SKIDS,
    realSeconds: 445.8,
    ghostKm: 12.0,
  },
  { topSpeed: 'kmh300', units: 0, ...AT_PLATFORM, ...ON_SKIDS, realSeconds: 0 },
  { topSpeed: 'kmh300', units: 45, ...AT_PLATFORM, ...LIFTED, realSeconds: 4.5 },
  {
    topSpeed: 'kmh300',
    units: 420,
    ...CRUISING,
    ...MOVING,
    realSeconds: 126.0,
    distance: 5000,
    speedKmh: 300,
    hz: 161.5,
    ghostKm: 0.89,
  },
  {
    topSpeed: 'kmh300',
    units: 600,
    ...BRAKING,
    ...MOVING,
    realSeconds: 361.9,
    distance: 24658,
    speedKmh: 300,
    hz: 161.5,
    ghostKm: 7.85,
  },
  {
    topSpeed: 'kmh300',
    units: 970,
    ...AT_AIRPORT,
    ...ON_SKIDS,
    realSeconds: 493.1,
    ghostKm: 14.7,
  },
];

function source(overrides: Partial<AssemblySource> = {}): AssemblySource {
  return {
    ...FAST,
    playing: true,
    nudge: null,
    nudgeToken: 0,
    compare: 'transrapid',
    view: { ...DEFAULT_VIEW },
    ...overrides,
  };
}

describe('live reading', () => {
  it('carries the trip time and the top speed of the chosen profile', () => {
    const fast = liveReading(FAST);
    expect(fast.tripSeconds).toBe(tripSeconds('kmh430'));
    expect(fast.tripSeconds).toBeCloseTo(448.8, 1);
    expect(fast.topMs).toBe(PROFILES.kmh430.topMs);
    const slow = liveReading({ ...FAST, topSpeed: 'kmh300' });
    expect(slow.tripSeconds).toBeCloseTo(496.1, 1);
    expect(slow.topMs).toBeCloseTo(83.33, 2);
  });

  it('runs the ghost on the real clock against the train position', () => {
    const { motion, ghost } = liveReading({ ...FAST, phase: MOMENTS.fullSpeed });
    expect(ghost).toEqual(ghostAt(motion.realSeconds, motion.distance));
    expect(ghost.behind).toBeCloseTo(motion.distance - ghost.distance, 9);
  });

  it('turns the wave off and brakes on the battery in a power cut', () => {
    const cut = liveReading({ ...FAST, phase: MOMENTS.brakeStart, brakeMode: 'eddy' });
    expect(cut.wave.on).toBe(false);
    expect(cut.power).toEqual({ flow: 'battery', onboard: 'battery', eddy: true });
    const sliding = liveReading({ ...FAST, phase: 935, brakeMode: 'eddy' });
    expect(sliding.motion).toMatchObject({ phase: 'brake', onSkids: true, sliding: true });
  });

  it('returns the same reading until the phase, top speed or brake mode changes', () => {
    const read = createLiveReader();
    const first = read({ ...FAST, phase: 200 });
    expect(read({ ...FAST, phase: 200 })).toBe(first);
    expect(read({ ...FAST, phase: 201 })).not.toBe(first);
    const fast = read({ ...FAST, phase: 200 });
    expect(read({ ...FAST, phase: 200, topSpeed: 'kmh300' })).not.toBe(fast);
    const slow = read({ ...FAST, phase: 200, topSpeed: 'kmh300' });
    expect(read({ ...FAST, phase: 200, topSpeed: 'kmh300', brakeMode: 'eddy' })).not.toBe(slow);
  });

  it('keeps a separate reading for each reader', () => {
    const first = createLiveReader();
    const second = createLiveReader();
    const reading = first({ ...FAST, phase: 200 });
    expect(second({ ...FAST, phase: 200 })).not.toBe(reading);
    expect(second({ ...FAST, phase: 200 })).toEqual(reading);
    expect(first({ ...FAST, phase: 200 })).toBe(reading);
  });
});

describe('assembly state', () => {
  it.each(READINGS)('reads $topSpeed at unit $units', (expected) => {
    const state = createAssemblyState(
      source({ phase: expected.units, topSpeed: expected.topSpeed }),
    );
    const { motion, wave, power, ghost } = state;
    expect(state).toMatchObject({ phase: expected.units, topSpeed: expected.topSpeed });
    expect(motion).toMatchObject({
      phase: expected.phase,
      gapMm: expected.gapMm,
      onSkids: expected.onSkids,
      sliding: false,
    });
    expect(motion.realSeconds).toBeCloseTo(expected.realSeconds, 1);
    expect(motion.distance).toBeCloseTo(expected.distance, -1);
    expect(motion.speedKmh).toBeCloseTo(expected.speedKmh, 6);
    expect(wave).toMatchObject({ on: expected.waveOn, reversed: expected.reversed });
    expect(wave.hz).toBeCloseTo(expected.hz, 1);
    expect(power).toEqual({ flow: expected.flow, onboard: expected.onboard, eddy: false });
    expect(ghost.distance / 1000).toBeCloseTo(expected.ghostKm, 1);
    expect(ghost.behind).toBeCloseTo(motion.distance - ghost.distance, 6);
  });

  it('fills the scalars, the nudge and the view from the store', () => {
    const view = { ...DEFAULT_VIEW, wave: true };
    const state = createAssemblyState(
      source({
        playing: false,
        brakeMode: 'eddy',
        nudge: 'gust',
        nudgeToken: 3,
        compare: 'scmaglev',
        view,
      }),
    );
    expect(state).toMatchObject({
      phase: 0,
      playing: false,
      topSpeed: 'kmh430',
      brakeMode: 'eddy',
      compare: 'scmaglev',
    });
    expect(state.nudge).toEqual({ id: 'gust', token: 3 });
    expect(state.view).toEqual(view);
    expect(state.view).not.toBe(view);
  });

  it('writes the next frame into the same objects', () => {
    const target: AssemblyState = createAssemblyState(source());
    const { motion, wave, power, ghost, nudge, view } = target;
    const result = writeAssemblyState(
      target,
      source({
        phase: MOMENTS.brakeStart,
        topSpeed: 'kmh300',
        nudge: 'bump',
        nudgeToken: 2,
        compare: 'wheelRail',
        view: { ...DEFAULT_VIEW, gap: true },
      }),
    );
    expect(result).toBe(target);
    expect(target.motion).toBe(motion);
    expect(target.wave).toBe(wave);
    expect(target.power).toBe(power);
    expect(target.ghost).toBe(ghost);
    expect(target.nudge).toBe(nudge);
    expect(target.view).toBe(view);
    expect(target).toMatchObject({ phase: 600, topSpeed: 'kmh300', compare: 'wheelRail' });
    expect(target.motion).toMatchObject({ phase: 'brake', speedKmh: 300 });
    expect(target.wave.reversed).toBe(true);
    expect(target.power.flow).toBe('regen');
    expect(target.nudge).toEqual({ id: 'bump', token: 2 });
    expect(target.view.gap).toBe(true);
  });

  it('reads through the reader it is given', () => {
    const read = createLiveReader();
    const reading = read(FAST);
    const state = createAssemblyState(source(), read);
    expect(state.motion).toEqual(reading.motion);
    expect(state.motion).not.toBe(reading.motion);
    writeAssemblyState(state, source({ phase: MOMENTS.fullSpeed }), read);
    expect(state.motion).toEqual(read({ ...FAST, phase: MOMENTS.fullSpeed }).motion);
  });

  it('keeps the source view untouched', () => {
    const view = { ...DEFAULT_VIEW };
    const state = createAssemblyState(source({ view }));
    state.view.labels = false;
    expect(view.labels).toBe(true);
  });
});
