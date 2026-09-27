import { describe, expect, it } from 'vitest';
import { POLAR_SPEED, SPREAD } from '../model';
import { GLIDER_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import { createGliderStore } from './store';

describe('glider store', () => {
  it('flies 60 s of flight time per second at 60 times faster than life', () => {
    const store = createGliderStore({ speed: 60, phase: 0, playing: true });
    store.getState().tick(0.5);
    expect(store.getState().phase).toBeCloseTo(30);
  });

  it('loops the 45 minute flight back to its start', () => {
    const store = createGliderStore({ speed: 60, phase: 2690, playing: true });
    store.getState().tick(0.5);
    expect(store.getState()).toMatchObject({ playing: true });
    expect(store.getState().phase).toBeCloseTo(20);
  });

  it('pauses at the start of a phase when jumping to it', () => {
    const store = createGliderStore({ playing: true, phase: 30 });
    store.getState().jumpToPhase('ridge');
    expect(store.getState()).toMatchObject({ phase: 990, playing: false });
  });

  it('flies the 18 m racer with the air view on by default', () => {
    const store = createGliderStore();
    expect(store.getState()).toMatchObject({
      glider: 'racer18',
      polarSpeed: POLAR_SPEED.default,
      spread: SPREAD.default,
      speed: 60,
      view: { forces: false, air: true, labels: false },
    });
  });

  it('keeps the airspeed and the spread within their sliders', () => {
    const store = createGliderStore();
    store.getState().setPolarSpeed(300);
    store.getState().setSpread(1);
    expect(store.getState()).toMatchObject({ polarSpeed: POLAR_SPEED.max, spread: SPREAD.min });
    store.getState().setPolarSpeed(140);
    store.getState().setSpread(15);
    expect(store.getState()).toMatchObject({ polarSpeed: 140, spread: 15 });
  });

  it('seeks the glide and keeps playing with the forces shown', () => {
    const store = createGliderStore({ playing: true, phase: 100 });
    store.getState().applyPreset('glide');
    expect(store.getState()).toMatchObject({
      preset: 'glide',
      phase: 520,
      playing: true,
      speed: 30,
      view: { air: false, forces: true },
    });
  });

  it('pauses just under the cloud and resumes at the ridge', () => {
    const store = createGliderStore({ playing: true });
    store.getState().applyPreset('cloud');
    expect(store.getState()).toMatchObject({ phase: 430, playing: false, pausedByPreset: true });
    store.getState().applyPreset('ridge');
    expect(store.getState()).toMatchObject({ phase: 1010, playing: true, speed: 30 });
  });

  it('keeps the reader glider type and labels through the chapters', () => {
    const store = createGliderStore();
    store.getState().setGlider('trainer');
    store.getState().setView({ labels: true });
    store.getState().applyPreset('wave');
    store.getState().applyPreset('overview');
    expect(store.getState()).toMatchObject({ glider: 'trainer', view: { labels: true } });
  });

  it('seeks every chapter to a moment inside its own phase', () => {
    const phaseOf = (time: number) =>
      GLIDER_TIMELINE.phases.find((phase) => time >= phase.start && time < phase.end)?.id;
    expect(phaseOf(PRESETS.glide.startAt ?? 0)).toBe('glide');
    expect(phaseOf(PRESETS.thermal.startAt ?? -1)).toBe('thermal');
    expect(phaseOf(PRESETS.cloud.pauseAt ?? -1)).toBe('thermal');
    expect(phaseOf(PRESETS.ridge.startAt ?? -1)).toBe('ridge');
    expect(phaseOf(PRESETS.wave.startAt ?? -1)).toBe('wave');
  });
});
