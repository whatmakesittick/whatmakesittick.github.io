import { beforeEach, describe, expect, it } from 'vitest';
import type { Explainer, Timeline } from '../explainer';
import { createExplainerStore } from '../store';
import { mountDock } from './dock';

const timeline: Timeline = {
  cycle: 100,
  step: 1,
  nudge: { fine: 1, coarse: 10 },
  labelKey: 'test.phase',
  phasesLabelKey: 'test.phases',
  formatPhase: String,
  describePhase: String,
  rate: (speed) => speed,
  phases: [
    { id: 'in', start: 0, end: 50, labelKey: 'phase.in', jumpLabelKey: 'jump.in', tone: 'red' },
    {
      id: 'out',
      start: 50,
      end: 100,
      labelKey: 'phase.out',
      jumpLabelKey: 'jump.out',
      tone: 'blue',
    },
  ],
  speed: { min: 1, max: 20, step: 1, labelKey: 'test.speed', format: String, describe: String },
};

const explainer = { timeline, dock: { choices: [], toggles: [] } } as unknown as Explainer;

const DOCK = `
  <div data-dock>
    <button data-control="play"></button>
    <span data-status="phase"></span>
    <span data-status="name"></span>
    <label data-scrubber-label></label>
    <input data-control="scrubber" type="range" />
    <div data-phase-buttons></div>
    <button data-control="more" aria-expanded="false"></button>
    <div data-speed-field>
      <label data-speed-label data-i18n="controls.speed"></label>
      <input data-control="speed" type="range" />
      <output data-speed-value></output>
    </div>
    <button data-control="reset-camera"></button>
  </div>
`;

function createStore() {
  return createExplainerStore({
    timeline,
    presets: { intro: {} },
    defaults: { preset: 'intro', speed: 10, view: {} },
    extend: () => ({}),
  });
}

describe('mountDock', () => {
  beforeEach(() => {
    document.body.innerHTML = DOCK;
  });

  it('keeps the play button label key in step with playback', () => {
    const store = createStore();
    mountDock(document, store, explainer);
    const play = document.querySelector<HTMLButtonElement>('[data-control="play"]');
    expect(play?.dataset.i18nAttr).toBe('aria-label:controls.pause');
    store.getState().pause();
    expect(play?.dataset.i18nAttr).toBe('aria-label:controls.play');
  });
});
