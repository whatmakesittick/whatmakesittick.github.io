import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Preset, Timeline } from '../explainer';
import { createExplainerStore } from '../store';
import { requireElement } from './dom';
import { mountRangeWidget } from './rangeWidget';
import type { RangeWidgetOptions } from './rangeWidget';

const LEVEL = { min: 0, max: 10, step: 1 };

const timeline: Timeline = {
  cycle: 100,
  step: 1,
  nudge: { fine: 1, coarse: 10 },
  labelKey: 'test.phase',
  phasesLabelKey: 'test.phases',
  formatPhase: String,
  describePhase: String,
  rate: (speed) => speed,
  phases: [{ id: 'only', start: 0, end: 100, labelKey: 'a', jumpLabelKey: 'a', tone: 'red' }],
  speed: { min: 1, max: 20, step: 1, labelKey: 's', format: String, describe: String },
};

interface Extension {
  level: number;
  setLevel(level: number): void;
}

function createLevelStore() {
  return createExplainerStore<Extension, Preset>({
    timeline,
    presets: { intro: {} },
    defaults: { preset: 'intro', speed: 1, view: {} },
    extend: (set) => ({ level: 4, setLevel: (level) => set({ level }) }),
  });
}

type LevelStore = ReturnType<typeof createLevelStore>;
type LevelState = ReturnType<LevelStore['getState']>;

const WIDGET_MARKUP = `
  <div class="range-widget">
    <label for="level">Level</label>
    <output for="level" data-readout="level"></output>
    <input id="level" type="range" data-control="level" />
    <dl class="range-widget__readouts"><dd data-readout="double"></dd></dl>
  </div>
`;

function levelOptions(
  extra: Partial<RangeWidgetOptions<LevelState, readonly [number]>> = {},
): RangeWidgetOptions<LevelState, readonly [number]> {
  return {
    control: 'level',
    range: LEVEL,
    select: (state) => [state.level] as const,
    value: ([level]) => level,
    format: ([level]) => `${level} units`,
    set: (state, value) => state.setLevel(value),
    ...extra,
  };
}

const input = () => requireElement<HTMLInputElement>(document, '[data-control="level"]');
const text = (id: string) => document.querySelector(`[data-readout="${id}"]`)?.textContent;

describe('mountRangeWidget', () => {
  beforeEach(() => {
    document.body.innerHTML = WIDGET_MARKUP;
  });

  it('configures the range and renders the selected state into the widget', () => {
    mountRangeWidget(document, createLevelStore(), levelOptions());
    expect([input().min, input().max, input().step]).toEqual(['0', '10', '1']);
    expect(input().value).toBe('4');
    expect(input().getAttribute('aria-valuetext')).toBe('4 units');
    expect(input().style.getPropertyValue('--fill')).toBe('40%');
    expect(text('level')).toBe('4 units');
  });

  it('fills every readout and passes the widget root to the after hook', () => {
    const after = vi.fn();
    const store = createLevelStore();
    mountRangeWidget(
      document,
      store,
      levelOptions({ readouts: { double: ([level]) => String(level * 2) }, after }),
    );
    store.getState().setLevel(7);
    expect(text('double')).toBe('14');
    expect(after).toHaveBeenLastCalledWith(
      [7],
      store.getState(),
      document.querySelector('.range-widget'),
    );
  });

  it('writes the slider position to the store', () => {
    const store = createLevelStore();
    mountRangeWidget(document, store, levelOptions());
    input().value = '9';
    input().dispatchEvent(new Event('input'));
    expect(store.getState().level).toBe(9);
    expect(text('level')).toBe('9 units');
  });

  it('works without an output or readouts', () => {
    document.querySelector('output')?.remove();
    const store = createLevelStore();
    mountRangeWidget(document, store, levelOptions());
    store.getState().setLevel(2);
    expect(input().getAttribute('aria-valuetext')).toBe('2 units');
  });

  it('stops listening once unmounted', () => {
    const store = createLevelStore();
    const unmount = mountRangeWidget(document, store, levelOptions());
    unmount();
    store.getState().setLevel(1);
    input().value = '8';
    input().dispatchEvent(new Event('input'));
    expect(text('level')).toBe('4 units');
    expect(store.getState().level).toBe(1);
  });

  it('refreshes at most once per interval and shows the latest state', () => {
    vi.useFakeTimers();
    const store = createLevelStore();
    const unmount = mountRangeWidget(document, store, levelOptions({ refreshIntervalMs: 33 }));
    expect(text('level')).toBe('4 units');
    store.getState().setLevel(5);
    store.getState().setLevel(6);
    expect(text('level')).toBe('4 units');
    vi.advanceTimersByTime(33);
    expect(text('level')).toBe('6 units');
    store.getState().setLevel(7);
    unmount();
    vi.advanceTimersByTime(33);
    expect(text('level')).toBe('6 units');
    vi.useRealTimers();
  });

  it('requires a range widget around the control', () => {
    document.body.innerHTML = '<input id="level" type="range" data-control="level" />';
    expect(() => mountRangeWidget(document, createLevelStore(), levelOptions())).toThrow(
      /range-widget/,
    );
  });
});
