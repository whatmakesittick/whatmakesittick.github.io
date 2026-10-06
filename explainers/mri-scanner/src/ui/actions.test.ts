import { describe, expect, it } from 'vitest';
import { FOLLOW_SEQUENCE, MOMENT_IDS } from '../ids';
import { MOMENTS } from '../model';
import { createMriScannerStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

function run(action: string, value: string) {
  const store = createMriScannerStore({ playing: true });
  CHAPTER_ACTIONS[action]?.run(store.getState(), value);
  return store.getState();
}

function current(action: string, state: ReturnType<typeof run>): string | undefined {
  return CHAPTER_ACTIONS[action]?.current?.(state);
}

describe('chapter actions', () => {
  it('switches the field everywhere and the weighting in the picture chapter', () => {
    expect(current('field', run('field', 'field30'))).toBe('field30');
    const picked = run('weighting', 't1');
    expect(picked.preset).toBe('picture');
    expect(current('weighting', picked)).toBe('t1');
  });

  it('picks a tissue in the resonance chapter', () => {
    const state = run('tissue', 'fluid');
    expect(state.preset).toBe('resonance');
    expect(current('tissue', state)).toBe('fluid');
  });

  it('holds one gradient coil or follows the sequence', () => {
    const held = run('gradientAxis', 'y');
    expect(held.gradientAxis).toBe('y');
    expect(current('gradientAxis', held)).toBe('y');
    const following = run('gradientAxis', FOLLOW_SEQUENCE);
    expect(following.gradientAxis).toBeNull();
    expect(current('gradientAxis', following)).toBe(FOLLOW_SEQUENCE);
  });

  it('pauses at each moment and marks it until playback moves on', () => {
    MOMENT_IDS.forEach((moment) => {
      const state = run('moment', moment);
      expect(state.playing).toBe(false);
      expect(state.phase).toBe(MOMENTS[moment]);
      expect(current('moment', state)).toBe(moment);
    });
    expect(current('moment', createMriScannerStore({ phase: 1 }).getState())).toBe('');
  });

  it('fills a chosen number of lines and marks only matching counts', () => {
    const state = run('lines', '32');
    expect(state.linesFilled).toBe(32);
    expect(current('lines', state)).toBe('32');
    expect(current('lines', createMriScannerStore({ linesFilled: 5 }).getState())).toBe('');
  });

  it('rejects values it does not know', () => {
    expect(() => run('lines', '7')).toThrow();
    expect(() => run('gradientAxis', 'w')).toThrow();
  });
});
