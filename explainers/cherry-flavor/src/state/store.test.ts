import { describe, expect, it } from 'vitest';
import { CYCLE_UNITS, DESK_START, FRUIT_DROPS, MOMENTS } from '../model';
import { createFlavorStore, snapToRange } from './store';

const FRAME = 1 / 60;

function run(store: ReturnType<typeof createFlavorStore>, seconds: number): void {
  const frames = Math.round(seconds / FRAME);
  for (let frame = 0; frame < frames; frame += 1) store.getState().tick(FRAME);
}

describe('flavor store', () => {
  it('opens on the tongue as the spoon goes in', () => {
    expect(createFlavorStore().getState()).toMatchObject({
      preset: 'tongue',
      phase: MOMENTS.inMouth,
      playing: true,
      speed: 2,
      scale: 'tongue',
      flavor: 'cherry',
      sniff: 'mix',
      servingC: -12,
      fatPercent: 10,
      desk: DESK_START,
      view: { labels: true, pinched: false },
    });
  });

  it('plays fifty units a second and stops at the end', () => {
    const store = createFlavorStore({ phase: 0 });
    run(store, 2);
    expect(store.getState().phase).toBeCloseTo(100, 0);
    run(store, 30);
    expect(store.getState()).toMatchObject({ phase: CYCLE_UNITS, playing: false });
  });

  it('snaps the sliders to their steps', () => {
    const store = createFlavorStore();
    store.getState().setServing(-20);
    store.getState().setFat(12.4);
    store.getState().setDrops('hexenal', 4.6);
    expect(store.getState()).toMatchObject({ servingC: -14, fatPercent: 12 });
    expect(store.getState().desk.hexenal).toBe(5);
    expect(snapToRange(11, { min: 0, max: 10, step: 1 })).toBe(10);
  });

  it('resets chapter controls on a chapter change but keeps the desk', () => {
    const store = createFlavorStore();
    store.getState().loadRecipe('fruit');
    store.getState().setFat(20);
    store.getState().applyPreset('desk');
    expect(store.getState()).toMatchObject({ flavor: 'desk', scale: 'molecules', fatPercent: 10 });
    expect(store.getState().desk).toEqual(FRUIT_DROPS);
    store.getState().setView({ pinched: true });
    store.getState().applyPreset('iceCream');
    expect(store.getState()).toMatchObject({ flavor: 'cherry', scale: 'tongue' });
    expect(store.getState().view.pinched).toBe(false);
  });

  it('pauses on the firing moment for the molecule chapters', () => {
    const store = createFlavorStore();
    store.getState().applyPreset('receptors');
    expect(store.getState()).toMatchObject({ phase: MOMENTS.firing, playing: false });
  });
});
