import { describe, expect, it } from 'vitest';
import { CORNER_NOZZLE_IDS, NOZZLE_IDS, REAR_NOZZLE_IDS } from '../ids';
import type { AssemblyState } from '../ids';
import { MOMENTS, RUN_BOOST_N, RUN_SECONDS, TOUCHDOWN_SPEED_MS, emptyShare } from '../model';
import {
  createAssemblyState,
  createLiveReader,
  liveReading,
  runOutcome,
  runUsedShare,
  writeAssemblyState,
} from './derived';
import type { AssemblySource, LiveSource } from './derived';
import { DEFAULT_VIEW } from './store';

const AIR_600: LiveSource = { phase: 0, gas: 'air', tankLitres: 600 };
const HELIUM_400: LiveSource = { phase: 0, gas: 'helium', tankLitres: 400 };

function source(overrides: Partial<AssemblySource> = {}): AssemblySource {
  return { ...AIR_600, playing: true, view: { ...DEFAULT_VIEW }, ...overrides };
}

function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

describe('live reading', () => {
  it('fires the four rear nozzles from a standing start with a full tank', () => {
    const reading = liveReading(AIR_600);
    expect(reading.phase).toBe('boost');
    expect(reading.car.position[0]).toBe(0);
    expect(reading.car.speed).toBe(0);
    REAR_NOZZLE_IDS.forEach((id) => expect(reading.nozzles[id]).toBeCloseTo(2267, 0));
    expect(reading.thrustN).toBeCloseTo(RUN_BOOST_N, 6);
    expect(reading.thrustN).toBeCloseTo(9067, 0);
    expect(reading.massFlowKgS).toBeCloseTo(9067 / 698, 2);
    expect(reading.tank).toMatchObject({ massShare: 1, pressureBar: 700, empty: false });
  });

  it('rolls the car on the right corner pair at 5 s, 7.9 m up', () => {
    const reading = liveReading({ ...AIR_600, phase: 5 });
    expect(reading.phase).toBe('flip');
    expect(reading.car.position[0]).toBeCloseTo(46.9, 1);
    expect(reading.car.height).toBeCloseTo(7.9, 1);
    expect(degrees(reading.car.roll)).toBeCloseTo(288, 0);
    expect(reading.nozzles.cornerFrontRight).toBe(2000);
    expect(reading.nozzles.cornerRearRight).toBe(2000);
    expect(reading.nozzles.cornerFrontLeft).toBe(0);
    expect(reading.thrustN).toBe(4000);
    expect(reading.massFlowKgS).toBeCloseTo(4000 / 698, 6);
  });

  it('stands still at 14 s about 86 m out with three quarters of the air left', () => {
    const reading = liveReading({ ...AIR_600, phase: RUN_SECONDS });
    expect(reading.phase).toBe('rest');
    expect(reading.car.position[0]).toBeCloseTo(86, 0);
    expect(reading.car.speed).toBeCloseTo(0, 6);
    expect(reading.thrustN).toBe(0);
    expect(reading.massFlowKgS).toBe(0);
    expect(reading.tank.massShare).toBeCloseTo(0.742, 3);
    expect(reading.tank.pressureBar).toBeCloseTo(285.5, 0);
  });

  it('shuts every nozzle once a 400 L helium tank runs dry in the catch', () => {
    const before = liveReading({ ...HELIUM_400, phase: 6.2 });
    expect(before.tank.empty).toBe(false);
    expect(before.thrustN).toBeGreaterThan(0);
    const dry = liveReading({ ...HELIUM_400, phase: 6.4 });
    expect(dry.phase).toBe('catch');
    expect(dry.tank.empty).toBe(true);
    expect(dry.tank.massShare).toBeCloseTo(emptyShare(), 9);
    expect(dry.thrustN).toBe(0);
    expect(dry.massFlowKgS).toBe(0);
    NOZZLE_IDS.forEach((id) => expect(dry.nozzles[id], id).toBe(0));
  });

  it('returns the same reading until the phase, gas or tank changes', () => {
    const read = createLiveReader();
    const first = read({ ...AIR_600, phase: 2 });
    expect(read({ ...AIR_600, phase: 2 })).toBe(first);
    expect(read({ ...AIR_600, phase: 2.1 })).not.toBe(first);
    const air = read({ ...AIR_600, phase: 2 });
    expect(read({ ...AIR_600, phase: 2, gas: 'nitrogen' })).not.toBe(air);
    const nitrogen = read({ ...AIR_600, phase: 2, gas: 'nitrogen' });
    expect(read({ ...AIR_600, phase: 2, gas: 'nitrogen', tankLitres: 400 })).not.toBe(nitrogen);
  });

  it('keeps a separate reading for each reader', () => {
    const first = createLiveReader();
    const second = createLiveReader();
    const reading = first({ ...AIR_600, phase: 2 });
    expect(second({ ...AIR_600, phase: 2 })).not.toBe(reading);
    expect(second({ ...AIR_600, phase: 2 })).toEqual(reading);
    expect(first({ ...AIR_600, phase: 2 })).toBe(reading);
  });
});

describe('run outcome', () => {
  it('lands air in a 600 L tank at 2.5 m/s with about a quarter used', () => {
    expect(runOutcome('air', 600)).toEqual({
      ranDry: false,
      emptyAtSeconds: null,
      touchdownMs: TOUCHDOWN_SPEED_MS,
    });
    expect(TOUCHDOWN_SPEED_MS).toBeCloseTo(2.5, 1);
    expect(runUsedShare('air', 600)).toBeCloseTo(0.258, 3);
  });

  it('runs a 400 L helium tank dry 0.62 s into the catch and lands 3.06 m/s harder', () => {
    const outcome = runOutcome('helium', 400);
    expect(outcome.ranDry).toBe(true);
    expect(outcome.emptyAtSeconds).toBeCloseTo(6.27, 2);
    expect((outcome.emptyAtSeconds ?? 0) - MOMENTS.rollComplete).toBeCloseTo(0.62, 2);
    expect(outcome.touchdownMs - TOUCHDOWN_SPEED_MS).toBeCloseTo(3.06, 2);
    expect(runUsedShare('helium', 400)).toBeCloseTo(1 - emptyShare(), 9);
  });
});

describe('assembly state', () => {
  it('fills the car, nozzles, tank, fans and view from the store', () => {
    const state = createAssemblyState(source({ phase: 3.5, playing: false }));
    expect(state).toMatchObject({
      phase: 3.5,
      playing: false,
      gas: 'air',
      tankLitres: 600,
      fans: true,
    });
    expect(state.car.onRamp).toBe(true);
    NOZZLE_IDS.forEach((id) => expect(state.nozzles[id], id).toBe(0));
    expect(state.view).toEqual(DEFAULT_VIEW);
  });

  it('writes the next frame into the same objects', () => {
    const target: AssemblyState = createAssemblyState(source());
    const { car, nozzles, tank, view } = target;
    const result = writeAssemblyState(
      target,
      source({ phase: 6, gas: 'nitrogen', view: { ...DEFAULT_VIEW, forces: true } }),
    );
    expect(result).toBe(target);
    expect(target.car).toBe(car);
    expect(target.nozzles).toBe(nozzles);
    expect(target.tank).toBe(tank);
    expect(target.view).toBe(view);
    expect(target).toMatchObject({ phase: 6, gas: 'nitrogen', fans: false });
    expect(target.car.airborne).toBe(true);
    CORNER_NOZZLE_IDS.forEach((id) => expect(target.nozzles[id], id).toBeCloseTo(7024, 0));
    expect(target.nozzles.rearInnerLeft).toBe(0);
    expect(target.tank.massShare).toBeLessThan(1);
    expect(target.view.forces).toBe(true);
  });

  it('keeps the source view untouched', () => {
    const view = { ...DEFAULT_VIEW };
    const state = createAssemblyState(source({ view }));
    state.view.labels = false;
    expect(view.labels).toBe(true);
  });
});
