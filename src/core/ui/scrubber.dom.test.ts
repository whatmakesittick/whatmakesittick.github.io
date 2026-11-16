import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Preset, Timeline } from '../explainer';
import { createExplainerStore } from '../store';
import { bindPhaseStatus, bindScrubber } from './scrubber';
import { TEXT_REFRESH_INTERVAL_MS } from './throttle';

const timeline: Timeline = {
  cycle: 100,
  step: 1,
  nudge: { fine: 1, coarse: 10 },
  labelKey: 'test.phase',
  phasesLabelKey: 'test.phases',
  formatPhase: String,
  describePhase: (phase) => `at ${phase}`,
  rate: (speed) => speed,
  phases: [
    { id: 'all', start: 0, end: 100, labelKey: 'phase.all', jumpLabelKey: 'jump.all', tone: 'red' },
  ],
  speed: { min: 1, max: 20, step: 1, labelKey: 'test.speed', format: String, describe: String },
};

interface UnitFields {
  unit: string;
  setUnit(next: string): void;
}

function createStore() {
  return createExplainerStore({
    timeline,
    presets: { intro: {} },
    defaults: { preset: 'intro', speed: 10, view: {} },
    extend: () => ({}),
  });
}

describe('bindScrubber', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    document.body.innerHTML = '<input type="range" />';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('moves the thumb on every phase change and throttles only the spoken value', () => {
    const input = document.querySelector('input')!;
    const store = createStore();
    bindScrubber(input, store, timeline);
    vi.advanceTimersByTime(TEXT_REFRESH_INTERVAL_MS + 1);
    store.getState().setPhase(10);
    expect(input.value).toBe('10');
    expect(input.getAttribute('aria-valuetext')).toBe('at 10');
    store.getState().setPhase(20);
    store.getState().setPhase(30);
    expect(input.value).toBe('30');
    expect(input.getAttribute('aria-valuetext')).toBe('at 10');
    vi.advanceTimersByTime(TEXT_REFRESH_INTERVAL_MS + 1);
    expect(input.getAttribute('aria-valuetext')).toBe('at 30');
  });

  it('renders the phase texts again when a format input changes at the same phase', () => {
    let unit = 's';
    const store = createExplainerStore<UnitFields, Preset>({
      timeline,
      presets: { intro: {} },
      defaults: { preset: 'intro', speed: 10, view: {} },
      extend: (set) => ({ unit, setUnit: (next: string) => set({ unit: next }) }),
    });
    const inputs: Timeline = {
      ...timeline,
      formatPhase: (phase) => `${phase} ${unit}`,
      describePhase: (phase) => `at ${phase} ${unit}`,
      formatInputs: () => [store.getState().unit],
    };
    document.body.innerHTML =
      '<input type="range" /><span id="value"></span><span id="name"></span>';
    const input = document.querySelector('input')!;
    const value = document.getElementById('value')!;
    bindScrubber(input, store, inputs);
    bindPhaseStatus(value, document.getElementById('name')!, store, inputs);
    store.getState().setPhase(10);
    vi.advanceTimersByTime(TEXT_REFRESH_INTERVAL_MS + 1);
    expect(value.textContent).toBe('10 s');
    unit = 'min';
    store.getState().setUnit('min');
    vi.advanceTimersByTime(TEXT_REFRESH_INTERVAL_MS + 1);
    expect(store.getState().phase).toBe(10);
    expect(value.textContent).toBe('10 min');
    expect(input.getAttribute('aria-valuetext')).toBe('at 10 min');
  });
});
