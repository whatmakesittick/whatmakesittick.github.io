import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Preset, Timeline } from '../explainer';
import { initI18n, setLanguage, t } from '../i18n';
import { createExplainerStore } from '../store';
import { mountLiveReadouts } from './liveReadouts';

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

const MARKUP = '<p data-readout="phase"></p><p data-readout="word"></p>';

function text(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

describe('live readouts', () => {
  beforeAll(() =>
    initI18n({
      en: () => Promise.resolve({ word: 'phase' }),
      de: () => Promise.resolve({ word: 'Phase' }),
    }),
  );

  beforeEach(async () => {
    document.body.innerHTML = MARKUP;
    await setLanguage('en');
  });

  it('writes each readout and follows the store', () => {
    const store = createStore();
    mountLiveReadouts(document, store, { phase: (state) => String(state.phase) });
    expect(text('phase')).toBe('0');
    store.getState().setPhase(42);
    expect(text('phase')).toBe('42');
  });

  it('writes the text again in a new language', async () => {
    mountLiveReadouts(document, createStore(), { word: () => t('word') });
    expect(text('word')).toBe('phase');
    await setLanguage('de');
    expect(text('word')).toBe('Phase');
  });

  it('stops following the store once disposed', () => {
    const store = createStore();
    const dispose = mountLiveReadouts(document, store, { phase: (state) => String(state.phase) });
    dispose();
    store.getState().setPhase(42);
    expect(text('phase')).toBe('0');
  });

  it('fails loudly when the markup has no element for a readout', () => {
    expect(() => mountLiveReadouts(document, createStore(), { missing: () => '' })).toThrow(
      'Missing element',
    );
  });
});
