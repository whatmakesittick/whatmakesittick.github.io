import { describe, expect, it, vi } from 'vitest';
import { momentPhase, phaseAt } from '../model';
import { PRESETS, presetHighlight } from './presets';
import type { PresetId } from './presets';
import { REGULATOR_RANGE, RESERVE_RANGE } from './ranges';
import { amplitudeOf, createWatchStore, dailyRateOf } from './store';

const CHAPTERS: readonly PresetId[] = [
  'overview',
  'mainspring',
  'train',
  'escapement',
  'balance',
  'hands',
];

function othersThan(...kept: PresetId[]): PresetId[] {
  return CHAPTERS.filter((id) => !kept.includes(id));
}

describe('watch store', () => {
  it('plays four full swings a second in real time', () => {
    const store = createWatchStore({ phase: 0, speed: 8, playing: true });
    store.getState().tick(0.05);
    expect(store.getState().phase).toBeCloseTo(72);
  });

  it('plays 32 times slower than life by default', () => {
    const store = createWatchStore({ phase: 0, playing: true });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(45);
  });

  it('counts a swing each time the loop wraps and takes it back when scrubbed back', () => {
    const store = createWatchStore({ phase: 350, speed: 8, playing: true });
    store.getState().tick(0.01);
    expect(store.getState()).toMatchObject({ cycles: 1 });
    expect(store.getState().phase).toBeCloseTo(4.4);
    store.getState().setPhase(355);
    expect(store.getState().cycles).toBe(0);
    store.getState().setPhase(200);
    expect(store.getState().cycles).toBe(0);
  });

  it('notifies subscribers once per frame while the loop does not wrap', () => {
    const store = createWatchStore({ phase: 10, speed: 8, playing: true });
    const listener = vi.fn();
    store.subscribe(listener);
    store.getState().tick(0.01);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().cycles).toBe(0);
  });

  it('pauses at the start of a moment when jumping to it', () => {
    const store = createWatchStore({ playing: true, phase: 30 });
    store.getState().jumpToPhase('swingBack');
    expect(store.getState()).toMatchObject({ phase: 180, playing: false });
  });

  it('starts fully wound, regulated, on the centre wheel at 28,800 vph with the dial on', () => {
    expect(createWatchStore().getState()).toMatchObject({
      reserve: RESERVE_RANGE.default,
      regulator: REGULATOR_RANGE.default,
      wheel: 'centreWheel',
      beatRate: 'vph28800',
      cycles: 0,
      speed: 3,
      view: { dial: true, bridges: true, energy: false, labels: false },
    });
  });

  it('keeps both sliders inside their ranges', () => {
    const store = createWatchStore();
    store.getState().setReserve(60);
    store.getState().setRegulator(-3);
    expect(store.getState()).toMatchObject({
      reserve: RESERVE_RANGE.max,
      regulator: REGULATOR_RANGE.min,
    });
    store.getState().setReserve(-1);
    expect(store.getState().reserve).toBe(RESERVE_RANGE.min);
  });

  it('picks a wheel and a beat rate', () => {
    const store = createWatchStore();
    store.getState().setWheel('escapeWheel');
    store.getState().setBeatRate('vph36000');
    expect(store.getState()).toMatchObject({ wheel: 'escapeWheel', beatRate: 'vph36000' });
  });

  it('swings less as the spring runs down and gains time as the index moves to fast', () => {
    const store = createWatchStore();
    expect(amplitudeOf(store.getState())).toBeCloseTo(280);
    store.getState().setReserve(0);
    expect(amplitudeOf(store.getState())).toBeCloseTo(186.3, 1);
    expect(dailyRateOf(store.getState())).toBeCloseTo(0);
    store.getState().setRegulator(0.5);
    expect(dailyRateOf(store.getState())).toBeGreaterThan(0);
  });

  it('pauses the escapement chapter with a tooth locked and resumes at the next chapter', () => {
    const store = createWatchStore({ playing: true });
    store.getState().applyPreset('escapement');
    expect(store.getState()).toMatchObject({ playing: false, pausedByPreset: true, speed: 1 });
    expect(store.getState().phase).toBeCloseTo(momentPhase('lock', 280));
    expect(phaseAt(store.getState().phase, 280)).toBe('swingIn');
    store.getState().applyPreset('balance');
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
  });

  it('keeps the reserve in the mainspring and balance chapters and winds it up elsewhere', () => {
    const store = createWatchStore();
    (['mainspring', 'balance'] as const).forEach((id) => {
      store.getState().setReserve(10);
      store.getState().applyPreset(id);
      expect(store.getState().reserve, id).toBe(10);
    });
    othersThan('mainspring', 'balance').forEach((id) => {
      store.getState().setReserve(10);
      store.getState().applyPreset(id);
      expect(store.getState().reserve, id).toBe(RESERVE_RANGE.default);
    });
  });

  it('keeps the regulator only in the balance chapter', () => {
    const store = createWatchStore();
    store.getState().setRegulator(0.4);
    store.getState().applyPreset('balance');
    expect(store.getState().regulator).toBe(0.4);
    othersThan('balance').forEach((id) => {
      store.getState().setRegulator(0.4);
      store.getState().applyPreset(id);
      expect(store.getState().regulator, id).toBe(REGULATOR_RANGE.default);
    });
  });

  it('goes back to the centre wheel and 28,800 vph when leaving their chapters', () => {
    const store = createWatchStore();
    store.getState().applyPreset('train');
    store.getState().setWheel('thirdWheel');
    store.getState().applyPreset('train');
    expect(store.getState().wheel).toBe('thirdWheel');
    store.getState().applyPreset('escapement');
    expect(store.getState().wheel).toBe('centreWheel');
    store.getState().applyPreset('hands');
    store.getState().setBeatRate('vph18000');
    store.getState().applyPreset('overview');
    expect(store.getState().beatRate).toBe('vph28800');
  });

  it('keeps the labels through the chapters', () => {
    const store = createWatchStore();
    store.getState().setView({ labels: true });
    CHAPTERS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState().view.labels).toBe(true);
  });

  it('opens the bridges again after the chapters that hide them', () => {
    const store = createWatchStore();
    store.getState().applyPreset('escapement');
    expect(store.getState().view).toMatchObject({ bridges: false, energy: false });
    store.getState().applyPreset('balance');
    expect(store.getState().view.bridges).toBe(true);
  });
});

describe('chapter highlight', () => {
  it('highlights the wheel the reader picked in the train chapter', () => {
    expect(presetHighlight(PRESETS.train, 'fourthWheel')).toEqual(['fourthWheel']);
  });

  it('keeps the chapter highlight elsewhere', () => {
    expect(presetHighlight(PRESETS.balance, 'fourthWheel')).toBe(PRESETS.balance.highlight);
    expect(presetHighlight(PRESETS.overview, 'barrel')).toEqual([]);
  });
});
