import { describe, expect, it } from 'vitest';
import { PRESET_IDS } from '../ids';
import { EXIT_MS, MOMENTS, START_MS, msAt, travelTimeMs, unitsAt } from '../model';
import { BULLET_TRAVEL } from '../model/layout';
import { PRESETS } from './presets';
import { DEFAULT_VIEW, createRifleStore } from './store';

describe('rifle store', () => {
  it('starts on the overview at the top of the cycle, port open and blink compared', () => {
    expect(createRifleStore().getState()).toMatchObject({
      phase: 0,
      speed: 1,
      preset: 'overview',
      gasPort: 'open',
      comparison: 'blink',
      view: { cutaway: false, gas: true, trail: true, labels: true },
    });
  });

  it('opens with the view the overview chapter asks for', () => {
    expect(DEFAULT_VIEW).toMatchObject(PRESETS.overview.view ?? {});
  });

  it('loops one shot every 6.4 s by default', () => {
    const store = createRifleStore({ phase: 0, playing: true });
    store.getState().tick(3.2);
    expect(store.getState().phase).toBeCloseTo(50);
    store.getState().tick(3.2);
    expect(store.getState().phase).toBeCloseTo(0);
    expect(store.getState().playing).toBe(true);
  });

  it('pauses at a moment in milliseconds', () => {
    const store = createRifleStore({ playing: true });
    store.getState().seekTime(MOMENTS.eject);
    expect(store.getState().playing).toBe(false);
    expect(msAt(store.getState().phase)).toBeCloseTo(MOMENTS.eject, 9);
  });

  it('pauses with the bullet at a travel down the barrel', () => {
    const store = createRifleStore({ playing: true });
    store.getState().seekTravel(100);
    expect(store.getState().playing).toBe(false);
    expect(store.getState().phase).toBeCloseTo(unitsAt(START_MS + travelTimeMs(100)), 9);
    store.getState().seekTravel(BULLET_TRAVEL + 10);
    expect(store.getState().phase).toBeCloseTo(unitsAt(EXIT_MS), 9);
    store.getState().seekTravel(-5);
    expect(store.getState().phase).toBeCloseTo(unitsAt(START_MS), 9);
  });

  it('keeps the gas port in its chapter and opens it again elsewhere', () => {
    const store = createRifleStore();
    PRESET_IDS.forEach((id) => {
      store.getState().applyPreset('gas');
      store.getState().setGasPort('blocked');
      store.getState().applyPreset(id);
      expect(store.getState().gasPort, id).toBe(id === 'gas' ? 'blocked' : 'open');
    });
  });

  it('keeps the comparison in its chapter and resets it elsewhere', () => {
    const store = createRifleStore();
    PRESET_IDS.forEach((id) => {
      store.getState().applyPreset('reload');
      store.getState().setComparison('car');
      store.getState().applyPreset(id);
      expect(store.getState().comparison, id).toBe(id === 'reload' ? 'car' : 'blink');
    });
  });

  it('pauses on the cartridge chapter and plays again on the next chapter', () => {
    const store = createRifleStore({ phase: 60, playing: true });
    store.getState().applyPreset('cartridge');
    expect(store.getState()).toMatchObject({ playing: false, phase: unitsAt(4), speed: 0 });
    store.getState().applyPreset('firing');
    expect(store.getState()).toMatchObject({ playing: true, phase: 0, speed: 0 });
    store.getState().applyPreset('reload');
    expect(store.getState()).toMatchObject({ playing: true, phase: unitsAt(10), speed: 1 });
  });

  it('keeps the labels through the chapters', () => {
    const store = createRifleStore();
    PRESET_IDS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState().view.labels).toBe(true);
  });
});
