import { describe, expect, it } from 'vitest';
import { DEFAULT_TANK_LITRES, EXIT_SPEED_MS, RUN_SECONDS } from '../model';
import { PRESETS } from './presets';
import {
  CALCULATOR_DEFAULTS,
  CALCULATOR_RANGES,
  DEFAULT_VIEW,
  START_PHASE,
  START_VIEW,
  createThrusterCarStore,
  snapToRange,
} from './store';

describe('thruster car store', () => {
  it('starts on the tank chapter, paused at the standing start, on air in a 600 L tank', () => {
    const state = createThrusterCarStore().getState();
    expect(state.preset).toBe('tank');
    expect(state.phase).toBe(START_PHASE);
    expect(START_PHASE).toBe(0);
    expect(state.playing).toBe(false);
    expect(state.pausedByPreset).toBe(true);
    expect(state.speed).toBe(1);
    expect(state.gas).toBe('air');
    expect(state.tankLitres).toBe(DEFAULT_TANK_LITRES);
    expect(state.view).toEqual(START_VIEW);
    expect(START_VIEW).toEqual({ ...DEFAULT_VIEW, ...PRESETS.tank.view });
  });

  it('starts every calculator on the run values', () => {
    const state = createThrusterCarStore().getState();
    expect(CALCULATOR_DEFAULTS).toMatchObject({
      fillShare: 1,
      pressureBar: 700,
      rearThrustKn: 80,
      rollInertia: 600,
    });
    expect(CALCULATOR_DEFAULTS.launchSpeed).toBe(EXIT_SPEED_MS);
    expect(CALCULATOR_DEFAULTS.launchSpeed).toBeCloseTo(13.3, 1);
    expect(state).toMatchObject(CALCULATOR_DEFAULTS);
  });

  it('clamps and snaps every calculator to its range', () => {
    const store = createThrusterCarStore();
    const { setFillShare, setPressureBar, setRearThrustKn, setLaunchSpeed, setRollInertia } =
      store.getState();
    setFillShare(0.37);
    setPressureBar(420);
    setRearThrustKn(3);
    setLaunchSpeed(13.3);
    setRollInertia(2000);
    expect(store.getState()).toMatchObject({
      fillShare: 0.35,
      pressureBar: 400,
      rearThrustKn: 10,
      launchSpeed: 13.5,
      rollInertia: 900,
    });
    setFillShare(-1);
    setPressureBar(10_000);
    expect(store.getState()).toMatchObject({ fillShare: 0, pressureBar: 700 });
  });

  it('snaps without float noise', () => {
    expect(snapToRange(0.149, CALCULATOR_RANGES.fillShare)).toBe(0.15);
    expect(snapToRange(0.7, CALCULATOR_RANGES.fillShare)).toBe(0.7);
    expect(snapToRange(8.26, CALCULATOR_RANGES.launchSpeed)).toBe(8.5);
  });

  it('sets the gas and takes only the two tank sizes', () => {
    const store = createThrusterCarStore();
    store.getState().setGas('helium');
    store.getState().setTankLitres(400);
    expect(store.getState()).toMatchObject({ gas: 'helium', tankLitres: 400 });
    store.getState().setTankLitres(500);
    expect(store.getState().tankLitres).toBe(400);
  });

  it('resets the calculators on a chapter change and keeps the gas and the tank', () => {
    const store = createThrusterCarStore();
    const state = store.getState();
    state.setGas('helium');
    state.setTankLitres(400);
    state.setFillShare(0.5);
    state.setRollInertia(800);
    state.applyPreset('nozzle');
    expect(store.getState()).toMatchObject({
      ...CALCULATOR_DEFAULTS,
      gas: 'helium',
      tankLitres: 400,
      preset: 'nozzle',
    });
  });

  it('keeps the calculators when the same chapter is applied again', () => {
    const store = createThrusterCarStore();
    store.getState().setPressureBar(300);
    store.getState().applyPreset('tank');
    expect(store.getState().pressureBar).toBe(300);
  });

  it('applies each chapter view, speed and seek, and leaves the labels as the reader left them', () => {
    const store = createThrusterCarStore();
    store.getState().toggleView('labels');
    store.getState().applyPreset('flip');
    const flip = store.getState();
    expect(flip.view).toEqual({ ...PRESETS.flip.view, labels: false });
    expect(flip.speed).toBe(0.5);
    expect(flip.phase).toBe(PRESETS.flip.startAt);
    expect(flip.playing).toBe(true);
    store.getState().applyPreset('nozzle');
    expect(store.getState()).toMatchObject({ phase: 1, playing: false });
  });

  it('plays the run once at the chosen speed and stops at the end', () => {
    const store = createThrusterCarStore({ phase: 0, playing: true, speed: 2 });
    store.getState().tick(1);
    expect(store.getState().phase).toBe(2);
    store.getState().tick(RUN_SECONDS);
    expect(store.getState()).toMatchObject({ phase: RUN_SECONDS, playing: false });
    store.getState().play();
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
  });

  it('keeps the playback speed inside its range', () => {
    const store = createThrusterCarStore();
    store.getState().setSpeed(5);
    expect(store.getState().speed).toBe(2);
    store.getState().setSpeed(0);
    expect(store.getState().speed).toBe(0.25);
  });
});
