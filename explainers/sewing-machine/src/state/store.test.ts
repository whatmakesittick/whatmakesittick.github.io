import { describe, expect, it } from 'vitest';
import { HOOK, STITCH_LENGTH } from '../model';
import { createSewingStore } from './store';

describe('sewing machine store', () => {
  it('turns the handwheel one full turn per stitch', () => {
    const store = createSewingStore({ speed: 60, phase: 0, playing: true });
    store.getState().tick(0.25);
    expect(store.getState().phase).toBeCloseTo(90);
  });

  it('pauses at the start of a phase when jumping to it', () => {
    const store = createSewingStore({ playing: true, phase: 30 });
    store.getState().jumpToPhase('wrap');
    expect(store.getState()).toMatchObject({ phase: 240, playing: false });
  });

  it('keeps the stitch length within the dial range', () => {
    const store = createSewingStore();
    store.getState().setStitchLength(9);
    expect(store.getState().stitchLength).toBe(STITCH_LENGTH.max);
    store.getState().setStitchLength(0);
    expect(store.getState().stitchLength).toBe(STITCH_LENGTH.min);
    store.getState().setStitchLength(3.5);
    expect(store.getState().stitchLength).toBe(3.5);
  });

  it('starts balanced and changes the top tension', () => {
    const store = createSewingStore();
    expect(store.getState().tension).toBe('balanced');
    store.getState().setTension('tight');
    expect(store.getState().tension).toBe('tight');
  });

  it('pauses at the moment the hook catches the loop in the needle chapter', () => {
    const store = createSewingStore({ playing: true, phase: 30 });
    store.getState().applyPreset('needle');
    expect(store.getState()).toMatchObject({
      preset: 'needle',
      phase: HOOK.catchAngle,
      playing: false,
      speed: 10,
      view: { cutaway: true },
    });
  });

  it('resumes after the pause when the next chapter has none', () => {
    const store = createSewingStore();
    store.getState().applyPreset('needle');
    store.getState().applyPreset('bobbin');
    expect(store.getState()).toMatchObject({ playing: true, pausedByPreset: false });
  });

  it('opens the cutaway for the hook and closes it for the feed', () => {
    const store = createSewingStore();
    store.getState().applyPreset('tension');
    expect(store.getState().view.cutaway).toBe(true);
    store.getState().applyPreset('feed');
    expect(store.getState().view.cutaway).toBe(false);
  });

  it('keeps labels the reader switched on through every chapter', () => {
    const store = createSewingStore();
    store.getState().setView({ labels: true });
    store.getState().applyPreset('bobbin');
    store.getState().applyPreset('overview');
    expect(store.getState().view.labels).toBe(true);
  });

  it('keeps the reader tension and stitch length through the chapters', () => {
    const store = createSewingStore();
    store.getState().setTension('loose');
    store.getState().setStitchLength(4);
    store.getState().applyPreset('feed');
    expect(store.getState()).toMatchObject({ tension: 'loose', stitchLength: 4 });
  });
});
