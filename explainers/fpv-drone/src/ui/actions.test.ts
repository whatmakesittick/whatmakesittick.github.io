import { describe, expect, it } from 'vitest';
import { MOMENT_IDS } from '../ids';
import { MOMENTS } from '../model';
import { createFpvStore } from '../state';
import { CHAPTER_ACTIONS, MOMENT_TOLERANCE_S } from './actions';

describe('chapter actions', () => {
  it('pauses at each moment and marks it as current', () => {
    const store = createFpvStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      store.getState().play();
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState().playing).toBe(false);
      expect(store.getState().phase).toBeCloseTo(MOMENTS[moment], 9);
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
  });

  it('keeps a moment current within its tolerance and marks none between them', () => {
    const near = createFpvStore({ phase: MOMENTS.onStation + 0.25 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(near)).toBe('onStation');
    const past = createFpvStore({ phase: MOMENTS.onStation + 0.4 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(past)).toBe('');
    const between = createFpvStore({ phase: 40 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(between)).toBe('');
    expect(() => CHAPTER_ACTIONS.moment.run(between, 'landing')).toThrow();
  });

  it('never marks two moments at once', () => {
    const seconds = MOMENT_IDS.map((moment) => MOMENTS[moment]);
    seconds
      .slice(1)
      .forEach((next, index) =>
        expect(next - seconds[index], MOMENT_IDS[index + 1]).toBeGreaterThan(
          2 * MOMENT_TOLERANCE_S,
        ),
      );
  });

  it('switches the move, the flight mode, the packet rate, the speedster and the video', () => {
    const store = createFpvStore();
    CHAPTER_ACTIONS.move.run(store.getState(), 'yaw');
    CHAPTER_ACTIONS.flightMode.run(store.getState(), 'horizon');
    CHAPTER_ACTIONS.packetRate.run(store.getState(), '50');
    CHAPTER_ACTIONS.speedster.run(store.getState(), 'record');
    CHAPTER_ACTIONS.video.run(store.getState(), 'digital');
    expect(store.getState()).toMatchObject({
      move: 'yaw',
      flightMode: 'horizon',
      packetRate: 50,
      speedster: 'record',
      video: 'digital',
    });
    expect(CHAPTER_ACTIONS.move.current?.(store.getState())).toBe('yaw');
    expect(CHAPTER_ACTIONS.flightMode.current?.(store.getState())).toBe('horizon');
    expect(CHAPTER_ACTIONS.packetRate.current?.(store.getState())).toBe('50');
    expect(CHAPTER_ACTIONS.speedster.current?.(store.getState())).toBe('record');
    expect(CHAPTER_ACTIONS.video.current?.(store.getState())).toBe('digital');
    expect(() => CHAPTER_ACTIONS.packetRate.run(store.getState(), '1000')).toThrow();
    expect(() => CHAPTER_ACTIONS.move.run(store.getState(), 'flip')).toThrow();
  });
});
