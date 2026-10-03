import { describe, expect, it } from 'vitest';
import { MOMENT_IDS, SPEED_MARK_IDS } from '../ids';
import { MOMENTS, SPEED_MARKS } from '../model';
import { createNavalDroneStore } from '../state';
import { CHAPTER_ACTIONS, MOMENT_TOLERANCE_SECONDS } from './actions';

describe('chapter actions', () => {
  it('pauses at each moment and marks it as current', () => {
    const store = createNavalDroneStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      store.getState().play();
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState().playing).toBe(false);
      expect(store.getState().phase).toBeCloseTo(MOMENTS[moment], 9);
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
  });

  it('keeps a moment current within its tolerance and marks none between them', () => {
    const near = createNavalDroneStore({ phase: MOMENTS.topSpeed + 0.25 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(near)).toBe('topSpeed');
    const between = createNavalDroneStore({ phase: 60 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(between)).toBe('');
    expect(() => CHAPTER_ACTIONS.moment.run(between, 'launch')).toThrow();
  });

  it('never marks two moments at once', () => {
    const seconds = MOMENT_IDS.map((moment) => MOMENTS[moment]);
    seconds
      .slice(1)
      .forEach((next, index) =>
        expect(next - seconds[index], MOMENT_IDS[index + 1]).toBeGreaterThan(
          2 * MOMENT_TOLERANCE_SECONDS,
        ),
      );
  });

  it('holds the boat at each speed mark and marks it as current', () => {
    const store = createNavalDroneStore({ phase: 60, playing: true });
    SPEED_MARK_IDS.forEach((mark) => {
      CHAPTER_ACTIONS.speedMark.run(store.getState(), mark);
      expect(store.getState()).toMatchObject({ trialKnots: SPEED_MARKS[mark], playing: false });
      expect(CHAPTER_ACTIONS.speedMark.current?.(store.getState())).toBe(mark);
    });
  });

  it('marks the speed mark the run passes while nobody holds the boat', () => {
    const atHump = createNavalDroneStore({ phase: MOMENTS.humpPeak }).getState();
    expect(CHAPTER_ACTIONS.speedMark.current?.(atHump)).toBe('hump');
    const between = createNavalDroneStore({ phase: 31 }).getState();
    expect(CHAPTER_ACTIONS.speedMark.current?.(between)).toBe('');
  });

  it('switches the helm, the link, the sea and the deck fit', () => {
    const store = createNavalDroneStore();
    CHAPTER_ACTIONS.helm.run(store.getState(), 'reverse');
    CHAPTER_ACTIONS.linkMode.run(store.getState(), 'backup');
    CHAPTER_ACTIONS.seaState.run(store.getState(), 'rough');
    CHAPTER_ACTIONS.fit.run(store.getState(), 'missile');
    expect(store.getState()).toMatchObject({
      helm: 'reverse',
      linkMode: 'backup',
      seaState: 'rough',
      fit: 'missile',
    });
    expect(CHAPTER_ACTIONS.helm.current?.(store.getState())).toBe('reverse');
    expect(CHAPTER_ACTIONS.linkMode.current?.(store.getState())).toBe('backup');
    expect(CHAPTER_ACTIONS.seaState.current?.(store.getState())).toBe('rough');
    expect(CHAPTER_ACTIONS.fit.current?.(store.getState())).toBe('missile');
    expect(() => CHAPTER_ACTIONS.seaState.run(store.getState(), 'storm')).toThrow();
  });
});
