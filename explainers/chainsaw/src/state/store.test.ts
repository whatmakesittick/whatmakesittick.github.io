import { describe, expect, it } from 'vitest';
import {
  CHAIN_LOOP_MM,
  CHAIN_MM_PER_TURN,
  GUARD_TRIP_SECONDS,
  IDLE_RPM,
  KICKBACK_SHOW_SECONDS,
  MAX_POWER_RPM,
  rate,
  screenTurnSeconds,
} from '../model';
import { PRESETS } from './presets';
import {
  CHAPTER_CONTROL_DEFAULTS,
  DEFAULT_VIEW,
  START_PHASE,
  START_VIEW,
  createChainsawStore,
  kickbackAfter,
} from './store';

const QUARTER_TURN = 90;
const FRAME = 1 / 60;

function runFor(store: ReturnType<typeof createChainsawStore>, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += FRAME) store.getState().tick(FRAME);
}

describe('chainsaw store', () => {
  it('starts on the whole saw at full throttle, at the top of the turn', () => {
    const state = createChainsawStore().getState();
    expect(state.preset).toBe('saw');
    expect(state.phase).toBe(START_PHASE);
    expect(state.throttle).toBe(1);
    expect(state.brake).toBe(false);
    expect(state.chainMm).toBe(0);
    expect(state.view).toEqual(START_VIEW);
    expect(START_VIEW).toEqual({ ...DEFAULT_VIEW, ...PRESETS.saw.view });
  });

  it('snaps the throttle to whole percent', () => {
    const store = createChainsawStore();
    store.getState().setThrottle(0.374);
    expect(store.getState().throttle).toBe(0.37);
    store.getState().setThrottle(2);
    expect(store.getState().throttle).toBe(1);
  });

  it('turns the crank at the rate of max power at full throttle and slower at idle', () => {
    const full = createChainsawStore({ phase: 0 });
    full.getState().tick(1);
    expect(full.getState().phase).toBeCloseTo(rate(full.getState().speed), 6);
    const idle = createChainsawStore({ phase: 0, throttle: 0 });
    idle.getState().tick(1);
    expect(idle.getState().phase).toBeCloseTo(
      (rate(idle.getState().speed) * IDLE_RPM) / MAX_POWER_RPM,
      6,
    );
    expect(screenTurnSeconds(3, IDLE_RPM)).toBeGreaterThan(11);
  });

  it('moves the chain with the crank only while the clutch drives', () => {
    const store = createChainsawStore({ phase: 0 });
    store.getState().tick(1);
    const crankDeg = store.getState().phase;
    expect(store.getState().chainMm).toBeCloseTo((crankDeg / 360) * CHAIN_MM_PER_TURN, 6);
    const idle = createChainsawStore({ phase: 0, throttle: 0 });
    runFor(idle, 1);
    expect(idle.getState().chainMm).toBe(0);
    const braked = createChainsawStore({ phase: 0, brake: true });
    runFor(braked, 1);
    expect(braked.getState().chainMm).toBe(0);
  });

  it('steps the chain with a scrub, both ways, and wraps it round the loop', () => {
    const store = createChainsawStore({ playing: false });
    store.getState().setPhase(QUARTER_TURN);
    expect(store.getState().chainMm).toBeCloseTo(CHAIN_MM_PER_TURN / 4, 6);
    store.getState().setPhase(0);
    expect(store.getState().chainMm).toBeCloseTo(0, 6);
    store.getState().setPhase(360 - QUARTER_TURN);
    expect(store.getState().chainMm).toBeCloseTo(CHAIN_LOOP_MM - CHAIN_MM_PER_TURN / 4, 6);
    store.getState().jumpToPhase('power');
    expect(store.getState().chainMm).toBeCloseTo(0, 6);
  });

  it('leaves the chain where it is on a chapter change', () => {
    const store = createChainsawStore({ playing: false, phase: 10 });
    store.getState().applyPreset('engine');
    expect(store.getState().phase).toBe(PRESETS.engine.startAt);
    expect(store.getState().chainMm).toBe(0);
  });

  it('resets the chapter controls on a chapter change and keeps them inside a chapter', () => {
    const store = createChainsawStore();
    store.getState().applyPreset('clutch');
    expect(store.getState().throttle).toBe(0);
    store.getState().setThrottle(0.6);
    store.getState().setBrake(true);
    store.getState().applyPreset('clutch');
    expect(store.getState().throttle).toBe(0.6);
    store.getState().applyPreset('chain');
    expect(store.getState().throttle).toBe(CHAPTER_CONTROL_DEFAULTS.throttle);
    expect(store.getState().brake).toBe(false);
  });

  it('keeps the labels toggle and the chain across chapters', () => {
    const store = createChainsawStore();
    store.getState().setView({ labels: false });
    store.getState().tick(1);
    const chainMm = store.getState().chainMm;
    store.getState().applyPreset('fuel');
    expect(store.getState().view.labels).toBe(false);
    expect(store.getState().chainMm).toBe(chainMm);
  });

  it('runs a kickback even while paused, trips the brake and ends on its own', () => {
    const store = createChainsawStore({ playing: false });
    store.getState().setBrake(true);
    store.getState().startKickback();
    expect(store.getState()).toMatchObject({ kickback: true, kickbackSeconds: 0, brake: false });
    runFor(store, GUARD_TRIP_SECONDS + FRAME);
    expect(store.getState().brake).toBe(true);
    store.getState().setBrake(false);
    runFor(store, FRAME * 2);
    expect(store.getState().brake).toBe(false);
    runFor(store, KICKBACK_SHOW_SECONDS);
    expect(store.getState()).toMatchObject({ kickback: false, kickbackSeconds: 0 });
  });

  it('trips the brake even when one long frame skips past the whole kickback', () => {
    const next = kickbackAfter({ kickback: true, kickbackSeconds: 0, brake: false }, 5);
    expect(next).toEqual({ kickback: false, kickbackSeconds: 0, brake: true });
  });
});
