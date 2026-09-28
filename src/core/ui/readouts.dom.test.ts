import { describe, expect, it } from 'vitest';
import type { Preset, Readout, Timeline } from '../explainer';
import { createExplainerStore } from '../store';
import { mountReadouts } from './readouts';

const TONE = 'red';

const timeline: Timeline = {
  cycle: 100,
  step: 1,
  nudge: { fine: 1, coarse: 10 },
  labelKey: 'test.phase',
  phasesLabelKey: 'test.phases',
  formatPhase: String,
  describePhase: String,
  rate: (speed) => speed,
  phases: [{ id: 'only', start: 0, end: 100, labelKey: 'a', jumpLabelKey: 'a', tone: TONE }],
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
  { id: 'plain', labelKey: 'a', numeric: true, value: () => '1', tone: () => TONE },
  {
    id: 'metered',
    labelKey: 'b',
    numeric: true,
    value: () => '2',
    tone: () => TONE,
    meter: { share: () => 0.5, fill: 'blue' },
  },
];

describe('gauge readouts', () => {
  it('puts the tone on the element that shows a numeric value', () => {
    document.body.innerHTML = '<dl data-readouts></dl>';
    mountReadouts(document, createStore(), READOUTS);
    const values = document.querySelectorAll<HTMLElement>('.readout-value');
    expect(Array.from(values, (value) => value.textContent)).toEqual(['1', '2']);
    values.forEach((value) => expect(value.style.getPropertyValue('--tone')).toBe(TONE));
  });
});
