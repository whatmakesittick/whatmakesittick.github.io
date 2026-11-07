import { describe, expect, it } from 'vitest';
import { CYCLE_UNITS, loopSeconds, rate } from '../model';
import { PRESETS } from './presets';
import {
  CHAPTER_CONTROL_DEFAULTS,
  DEFAULT_VIEW,
  START_PHASE,
  START_VIEW,
  createPianoStore,
} from './store';

describe('piano store', () => {
  it('starts on the key chapter, playing a medium stroke with no pedal', () => {
    const state = createPianoStore().getState();
    expect(state.preset).toBe('key');
    expect(START_PHASE).toBe(0);
    expect(state.phase).toBe(START_PHASE);
    expect(state.playing).toBe(true);
    expect(state.pausedByPreset).toBe(false);
    expect(state.speed).toBe(2);
    expect(state).toMatchObject({ touch: 'medium', pedal: 'none', ...CHAPTER_CONTROL_DEFAULTS });
    expect(state.view).toEqual(START_VIEW);
    expect(START_VIEW).toEqual({ ...DEFAULT_VIEW, ...PRESETS.key.view });
  });

  it('keeps middle C and the grand as chapter defaults and shows only the labels', () => {
    expect(CHAPTER_CONTROL_DEFAULTS).toEqual({ register: 'middle', compare: 'grand' });
    expect(Object.entries(DEFAULT_VIEW).filter(([, on]) => on)).toEqual([['labels', true]]);
  });

  it('sets the touch, the pedal, the register and the comparison', () => {
    const store = createPianoStore();
    store.getState().setTouch('hard');
    store.getState().setPedal('sustain');
    store.getState().setRegister('bass');
    store.getState().setCompare('harpsichord');
    expect(store.getState()).toMatchObject({
      touch: 'hard',
      pedal: 'sustain',
      register: 'bass',
      compare: 'harpsichord',
    });
  });

  it('resets the register and the comparison on a chapter change and keeps touch and pedal', () => {
    const store = createPianoStore();
    const state = store.getState();
    state.setTouch('soft');
    state.setPedal('unaCorda');
    state.setRegister('treble');
    state.setCompare('upright');
    state.applyPreset('lever');
    expect(store.getState()).toMatchObject({
      ...CHAPTER_CONTROL_DEFAULTS,
      touch: 'soft',
      pedal: 'unaCorda',
      preset: 'lever',
    });
  });

  it('applies the chapter start over the defaults', () => {
    const store = createPianoStore();
    store.getState().setCompare('harpsichord');
    store.getState().applyPreset('compare');
    expect(store.getState().compare).toBe('grand');
    store.getState().setRegister('bass');
    store.getState().applyPreset('room');
    expect(store.getState().register).toBe('middle');
  });

  it('keeps the chapter controls when the same chapter is applied again', () => {
    const store = createPianoStore();
    store.getState().setRegister('treble');
    store.getState().applyPreset('key');
    expect(store.getState().register).toBe('treble');
  });

  it('applies each chapter view, speed and seek, and leaves the reader views as they were', () => {
    const store = createPianoStore();
    store.getState().toggleView('labels');
    store.getState().toggleView('sound');
    store.getState().toggleView('follow');
    const reader = { labels: false, sound: true, follow: true };
    store.getState().applyPreset('letGo');
    expect(store.getState()).toMatchObject({ speed: 0, phase: 250, playing: true });
    expect(store.getState().view).toEqual({ ...PRESETS.letGo.view, ...reader });
    store.getState().applyPreset('room');
    expect(store.getState()).toMatchObject({ speed: 2, phase: 380, playing: true });
    expect(store.getState().view).toEqual({ ...PRESETS.room.view, ...reader });
  });

  it('loops the key stroke', () => {
    const speed = 2;
    const store = createPianoStore({ phase: 0, playing: true, speed });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(rate(speed), 9);
    store.getState().tick(loopSeconds(speed));
    expect(store.getState().phase).toBeCloseTo(rate(speed), 6);
    expect(store.getState().phase).toBeLessThan(CYCLE_UNITS);
    expect(store.getState().playing).toBe(true);
  });

  it('keeps the playback speed inside its range', () => {
    const store = createPianoStore();
    store.getState().setSpeed(100);
    expect(store.getState().speed).toBe(3);
    store.getState().setSpeed(-1);
    expect(store.getState().speed).toBe(0);
  });
});
