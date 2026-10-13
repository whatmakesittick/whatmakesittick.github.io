import { describe, expect, it, vi } from 'vitest';
import type { Explainer, Preset, Readout, Timeline } from '../explainer';
import { createExplainerStore } from '../store';
import { EMBED_DOM } from './contract';
import { mountEmbedControls } from './controls';

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

function createStore() {
  return createExplainerStore<object, Preset>({
    timeline,
    presets: { intro: {} },
    defaults: { preset: 'intro', speed: 1, view: {} },
    extend: () => ({}),
  });
}

type State = ReturnType<ReturnType<typeof createStore>['getState']>;

const READOUTS: readonly Readout<State>[] = [
  { id: 'clock', labelKey: 'a', numeric: true, value: (state) => String(state.phase) },
];

function demo(overrides: Partial<Explainer<State>>): Explainer<State> {
  return {
    id: 'demo',
    timeline,
    presets: { intro: {} },
    dock: { choices: [], toggles: [] },
    readouts: READOUTS,
    ...overrides,
  } as unknown as Explainer<State>;
}

function panel() {
  const unmount = vi.fn();
  const mountGauge = vi.fn((gauge: HTMLElement) => {
    gauge.prepend(Object.assign(document.createElement('div'), { className: 'extra' }));
    return unmount;
  });
  return { mountGauge, unmount };
}

describe('embed gauge', () => {
  it('hands the explainer the gauge it fills with the readouts', () => {
    const slot = document.createElement('div');
    const store = createStore();
    const { mountGauge, unmount } = panel();
    const controls = mountEmbedControls({ gauge: slot }, store, demo({ mountGauge }));
    const gauge = slot.querySelector(`[${EMBED_DOM.gaugeAttr}]`);
    expect(controls.mounted.gauge).toBe(true);
    expect(mountGauge).toHaveBeenCalledExactlyOnceWith(gauge, store);
    expect(gauge?.firstElementChild?.className).toBe('extra');
    expect(gauge?.querySelectorAll('.readout')).toHaveLength(1);
    expect(unmount).not.toHaveBeenCalled();
    controls.dispose();
    expect(unmount).toHaveBeenCalledOnce();
    expect(slot.childElementCount).toBe(0);
  });

  it('mounts the gauge for an explainer that only adds its own panel', () => {
    const slot = document.createElement('div');
    const { mountGauge } = panel();
    const controls = mountEmbedControls(
      { gauge: slot },
      createStore(),
      demo({ readouts: [], mountGauge }),
    );
    expect(controls.mounted.gauge).toBe(true);
    expect(mountGauge).toHaveBeenCalledOnce();
    controls.dispose();
  });

  it('leaves the slot empty without readouts or a panel', () => {
    const slot = document.createElement('div');
    const controls = mountEmbedControls({ gauge: slot }, createStore(), demo({ readouts: [] }));
    expect(controls.mounted.gauge).toBe(false);
    expect(slot.childElementCount).toBe(0);
    controls.dispose();
  });
});
