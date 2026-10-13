import { describe, expect, it } from 'vitest';
import {
  CHAIN_MM_PER_TURN,
  ENGAGE_RPM,
  GUARD_TRIP_SECONDS,
  IDLE_RPM,
  MAX_CHAIN_SPEED_MS,
  MAX_POWER_RPM,
  RISE_DEG,
  RISE_SECONDS,
  FAST_IDLE_RPM,
  PULL_CRANK_DEG_PER_S,
  POP_COAST_DEG,
  TAKE_UP_SECONDS,
  SPARK_DEG,
  START_STEP_SECONDS,
  rate,
  startPose,
} from '../model';
import {
  createAssemblyState,
  crankcaseTrend,
  liveReading,
  startCrankRate,
  startDisplayOf,
  writeAssemblyState,
} from './derived';
import type { AssemblySource } from './derived';
import { DEFAULT_VIEW } from './store';

function source(overrides: Partial<AssemblySource> = {}): AssemblySource {
  return {
    phase: 0,
    playing: true,
    speed: 3,
    preset: 'saw',
    throttle: 1,
    brake: false,
    kickback: false,
    kickbackSeconds: 0,
    chainMm: 0,
    view: { ...DEFAULT_VIEW },
    engine: 'running',
    starting: false,
    startSeconds: 0,
    ...overrides,
  };
}

describe('live reading', () => {
  it('runs the chain at 22.0 m/s at full throttle and stops it at idle', () => {
    expect(liveReading(source())).toMatchObject({
      rpm: MAX_POWER_RPM,
      clutch: 'driving',
      oiling: true,
    });
    expect(liveReading(source()).chainSpeed).toBeCloseTo(MAX_CHAIN_SPEED_MS, 9);
    expect(liveReading(source({ throttle: 0 }))).toMatchObject({
      rpm: IDLE_RPM,
      clutch: 'open',
      chainSpeed: 0,
      oiling: false,
    });
  });

  it('slips the clutch against the brake', () => {
    expect(liveReading(source({ brake: true }))).toMatchObject({
      clutch: 'slipping',
      chainSpeed: 0,
      oiling: false,
    });
  });

  it('reuses the reading while the throttle and brake stay the same', () => {
    expect(liveReading(source())).toBe(liveReading(source({ phase: 90, playing: false })));
    expect(liveReading(source())).not.toBe(liveReading(source({ throttle: 0.5 })));
  });

  it('squeezes the crankcase on the way down and draws on the way up', () => {
    expect(crankcaseTrend(90)).toBe('squeezing');
    expect(crankcaseTrend(270)).toBe('drawing');
    expect(crankcaseTrend(-90)).toBe('drawing');
  });
});

describe('assembly state', () => {
  it('places the setting of the chapter', () => {
    expect(createAssemblyState(source()).setting).toBe('cutting');
    expect(createAssemblyState(source({ preset: 'engine' })).setting).toBe('bench');
    expect(createAssemblyState(source({ preset: 'kickback' })).setting).toBe('kickback');
  });

  it('reads the crank, its ports and its spark from the phase', () => {
    const state = createAssemblyState(source({ phase: SPARK_DEG + 1 }));
    expect(state.crank).toMatchObject({ angle: SPARK_DEG + 1, phase: 'compression', sparkGlow: 1 });
    expect(state.crank.degPerSecond).toBeCloseTo(rate(3), 9);
    const bottom = createAssemblyState(source({ phase: 180, playing: false }));
    expect(bottom.crank.ports.exhaust).toBeCloseTo(1, 9);
    expect(bottom.crank.flows.transfer).toBeCloseTo(1, 9);
    expect(bottom.crank.crankcasePressure).toBe(1);
    expect(bottom.crank.degPerSecond).toBe(0);
  });

  it('turns the drum with the chain and throws the shoes out above idle', () => {
    const state = createAssemblyState(source({ chainMm: CHAIN_MM_PER_TURN / 4 }));
    expect(state.drive.drumDeg).toBeCloseTo(90, 9);
    expect(state.drive.shoesOut).toBe(1);
    expect(createAssemblyState(source({ throttle: 0 })).drive.shoesOut).toBe(0);
    expect(liveReading(source({ throttle: 0.13 })).rpm).toBeLessThan(ENGAGE_RPM);
  });

  it('lifts the saw in a kickback and holds the guard forward while the brake is on', () => {
    const rising = createAssemblyState(source({ kickback: true, kickbackSeconds: RISE_SECONDS }));
    expect(rising.safety.riseDeg).toBe(RISE_DEG);
    expect(rising.safety.guardForward).toBe(1);
    const early = createAssemblyState(
      source({ kickback: true, kickbackSeconds: GUARD_TRIP_SECONDS / 2 }),
    );
    expect(early.safety.guardForward).toBe(0);
    expect(createAssemblyState(source({ brake: true })).safety.guardForward).toBe(1);
    expect(createAssemblyState(source()).safety).toEqual({
      brake: false,
      kickback: false,
      riseDeg: 0,
      guardForward: 0,
    });
  });

  it('rewrites the same objects so the bindings can double buffer', () => {
    const target = createAssemblyState(source());
    const { crank, drive, safety, view } = target;
    const { ports, flows } = crank;
    const next = writeAssemblyState(
      target,
      source({ phase: 200, preset: 'clutch', view: { ...DEFAULT_VIEW, cutaway: true } }),
    );
    expect(next).toBe(target);
    expect([next.crank, next.drive, next.safety, next.view]).toEqual([crank, drive, safety, view]);
    expect(next.crank.ports).toBe(ports);
    expect(next.crank.flows).toBe(flows);
    expect(next.crank.angle).toBe(200);
    expect(next.setting).toBe('bench');
    expect(next.view.cutaway).toBe(true);
  });

  it('stops the engine and gates the spark and the burn until it fires', () => {
    const stopped = createAssemblyState(source({ engine: 'stopped', phase: SPARK_DEG + 1 }));
    expect(stopped.crank).toMatchObject({ rpm: 0, sparkGlow: 0 });
    expect(stopped.crank.flows.burn).toBe(0);
    expect(stopped.drive).toMatchObject({ clutch: 'open', chainSpeed: 0, shoesOut: 0 });
    expect(stopped.start).toMatchObject({ starting: false, step: 'brake', engine: 'stopped' });
    const fastIdle = createAssemblyState(source({ engine: 'fastIdle', phase: SPARK_DEG + 1 }));
    expect(fastIdle.crank).toMatchObject({ rpm: FAST_IDLE_RPM, sparkGlow: 1 });
  });

  it('writes the start pose while starting and turns the crank at the pull rate', () => {
    const seconds = START_STEP_SECONDS.brake + START_STEP_SECONDS.choke + 3;
    const pose = startPose(seconds);
    const state = createAssemblyState(
      source({ engine: 'cranking', starting: true, startSeconds: seconds, playing: false }),
    );
    expect(state.start).toMatchObject({
      starting: true,
      step: pose.step,
      ropeOut: pose.ropeOut,
      pulleyDeg: pose.pulleyDeg,
      pawlsEngaged: pose.pawlsEngaged,
      chokeLever: pose.chokeLever,
    });
    expect(state.crank.degPerSecond).toBeCloseTo(PULL_CRANK_DEG_PER_S, 6);
  });

  it('reads the crank rate off the start pose through the take-up and the pop coast', () => {
    const pullFrom =
      START_STEP_SECONDS.brake +
      START_STEP_SECONDS.choke +
      START_STEP_SECONDS.decompression +
      START_STEP_SECONDS.primer;
    const takeUp = startCrankRate(pullFrom + TAKE_UP_SECONDS / 2);
    expect(takeUp).toBeGreaterThan(0);
    expect(takeUp).toBeLessThan(PULL_CRANK_DEG_PER_S / 2);
    const popMiddle = pullFrom + START_STEP_SECONDS.firstPull + START_STEP_SECONDS.pop / 2;
    const smoothstepPeak = 1.5;
    expect(startCrankRate(popMiddle)).toBeCloseTo(
      (smoothstepPeak * POP_COAST_DEG) / START_STEP_SECONDS.pop,
      0,
    );
  });

  it('shows ready, each step, then done', () => {
    expect(startDisplayOf({ engine: 'stopped', starting: false, startSeconds: 0 })).toBe('ready');
    expect(startDisplayOf({ engine: 'stopped', starting: true, startSeconds: 0.1 })).toBe('brake');
    expect(startDisplayOf({ engine: 'running', starting: false, startSeconds: 0 })).toBe('done');
  });
});
