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

  it('switches the helm, the link, the sea and the deck fit in their own chapters', () => {
    const cases = [
      ['helm', 'reverse', 'jet'],
      ['linkMode', 'backup', 'link'],
      ['seaState', 'rough', 'horizon'],
      ['fit', 'missile', 'fleet'],
    ] as const;
    cases.forEach(([action, value, preset]) => {
      const store = createNavalDroneStore();
      CHAPTER_ACTIONS[action].run(store.getState(), value);
      expect(store.getState().preset, action).toBe(preset);
      expect(store.getState()[action], action).toBe(value);
      expect(CHAPTER_ACTIONS[action].current?.(store.getState()), action).toBe(value);
    });
    expect(() =>
      CHAPTER_ACTIONS.seaState.run(createNavalDroneStore().getState(), 'storm'),
    ).toThrow();
  });

  it('brings back the hull chapter when its speed marks are used after the jet took over', () => {
    const store = createNavalDroneStore();
    store.getState().applyPreset('jet');
    CHAPTER_ACTIONS.speedMark.run(store.getState(), 'hullSpeed');
    expect(store.getState()).toMatchObject({ preset: 'hull', trialKnots: SPEED_MARKS.hullSpeed });
    CHAPTER_ACTIONS.speedMark.run(store.getState(), 'planing');
    expect(store.getState()).toMatchObject({ preset: 'hull', trialKnots: SPEED_MARKS.planing });
  });
});
