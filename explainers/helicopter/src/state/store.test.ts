import { describe, expect, it } from 'vitest';
import { COLLECTIVE_RANGE } from '../model';
import { createHelicopterStore } from './store';

describe('helicopter store', () => {
  it('turns the rotor one full circle per second at 60 rpm', () => {
    const store = createHelicopterStore({ speed: 60, phase: 0, playing: true });
    store.getState().tick(0.25);
    expect(store.getState().phase).toBeCloseTo(90);
  });

  it('pauses at the start of a half turn when jumping to it', () => {
    const store = createHelicopterStore({ playing: true, phase: 30 });
    store.getState().jumpToPhase('retreating');
    expect(store.getState()).toMatchObject({ phase: 180, playing: false });
  });

  it('keeps the collective within its travel', () => {
    const store = createHelicopterStore();
    store.getState().setCollective(2);
    expect(store.getState().collective).toBe(COLLECTIVE_RANGE.max);
    store.getState().setCollective(-1);
    expect(store.getState().collective).toBe(COLLECTIVE_RANGE.min);
  });

  it('sets the flight mode and collective from a preset', () => {
    const store = createHelicopterStore();
    store.getState().setCollective(0.9);
    store.getState().applyPreset('forward');
    expect(store.getState()).toMatchObject({
      preset: 'forward',
      flightMode: 'forward',
      collective: COLLECTIVE_RANGE.hover,
    });
  });

  it('leaves the collective alone for presets without one', () => {
    const store = createHelicopterStore();
    store.getState().applyPreset('forward');
    store.getState().setCollective(0.8);
    store.getState().applyPreset('collective');
    expect(store.getState()).toMatchObject({ flightMode: 'hover', collective: 0.8 });
  });

  it('keeps labels the reader switched on through a preset without a view', () => {
    const store = createHelicopterStore();
    store.getState().setView({ labels: true });
    store.getState().applyPreset('torque');
    expect(store.getState().view.labels).toBe(true);
    store.getState().applyPreset('overview');
    expect(store.getState().view.labels).toBe(true);
  });
});
