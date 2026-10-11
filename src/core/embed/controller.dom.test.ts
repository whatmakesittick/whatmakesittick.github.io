import { describe, expect, it, vi } from 'vitest';
import type { Choice, Explainer, Playback, Timeline } from '../explainer';
import { resolveLanguage, useEnglishOnly, useLanguage } from '../i18n/embedded';
import { currentLanguage } from '../i18n';
import { createExplainerStore } from '../store';
import { createController, describeExplainer } from './controller';

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
    { id: 'in', start: 0, end: 50, labelKey: 'test.in', jumpLabelKey: 'test.in', tone: 'red' },
    {
      id: 'out',
      start: 50,
      end: 100,
      labelKey: 'test.out',
      jumpLabelKey: 'test.out',
      tone: 'blue',
    },
  ],
  speed: { min: 1, max: 20, step: 1, labelKey: 'test.speed', format: String, describe: String },
};

function createStore() {
  return createExplainerStore({
    timeline,
    presets: { intro: {}, detail: {} },
    defaults: { preset: 'intro', speed: 10, view: { labels: true } },
    extend: () => ({}),
  });
}

type State = ReturnType<ReturnType<typeof createStore>['getState']>;

const size: Choice<State> = {
  id: 'size',
  labelKey: 'test.size',
  options: [
    { value: 'small', labelKey: 'test.small' },
    { value: 'large', labelKey: 'test.large' },
  ],
  select: (state) => (state.speed > 10 ? 'large' : 'small'),
  apply: (state, value) => state.setSpeed(value === 'large' ? 20 : 5),
};

const explainer = {
  id: 'demo',
  timeline,
  presets: { intro: {}, detail: {} },
  dock: { choices: [size], toggles: [] },
} as unknown as Explainer<State & Playback>;

const dictionary = {
  meta: { title: 'Demo', eyebrow: 'Test', tagline: 'A test' },
  sections: { intro: { title: 'Intro', p1: 'First <strong>one</strong>' } },
  test: { in: 'In', out: 'Out', speed: 'Speed', size: 'Size', small: 'Small', large: 'Large' },
};

const german = {
  meta: { title: 'Vorführung' },
  sections: { intro: { p1: 'Erster <strong>Teil</strong>' } },
  test: { in: 'Rein' },
};

const outline = [{ id: 'intro', paragraphs: ['sections.intro.p1'] }];

describe('embed controller', () => {
  useEnglishOnly(dictionary);

  it('describes the explainer in English', () => {
    const info = describeExplainer('demo', explainer, [
      { id: 'intro', paragraphs: ['sections.intro.p1'] },
    ]);
    expect(info.title).toBe('Demo');
    expect(info.language).toBe('en');
    expect(info.chapters).toEqual([
      { id: 'intro', index: 1, title: 'Intro', paragraphsHtml: ['First <strong>one</strong>'] },
    ]);
    expect(info.phases.map((phase) => phase.label)).toEqual(['In', 'Out']);
    expect(info.choices[0]?.options.map((option) => option.label)).toEqual(['Small', 'Large']);
  });

  it('drives the store and reports its state', () => {
    const store = createStore();
    const info = describeExplainer('demo', explainer, []);
    const unmount = vi.fn();
    const controller = createController(info, explainer, store, undefined, unmount);
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.setChapter('detail');
    controller.seek(0.75);
    controller.pause();
    controller.setChoice('size', 'large');
    controller.setChoice('size', 'huge');
    const state = controller.getState();
    expect(state.chapter).toBe('detail');
    expect(state.playing).toBe(false);
    expect(state.phaseId).toBe('out');
    expect(state.choices).toEqual({ size: 'large' });
    expect(listener).toHaveBeenCalled();
    controller.dispose();
    controller.play();
    expect(store.getState().playing).toBe(false);
    expect(unmount).toHaveBeenCalledOnce();
  });

  it('switches language in place and tells its subscribers', async () => {
    const locales = {
      en: () => Promise.resolve(dictionary),
      de: () => Promise.resolve(german),
    };
    await useLanguage(locales, 'en');
    const describe = () => describeExplainer('demo', explainer, outline);
    const apply = vi.fn((language: string) => useLanguage(locales, resolveLanguage(language)));
    const controller = createController(describe(), explainer, createStore(), undefined, vi.fn(), {
      apply,
      describe,
    });
    const listener = vi.fn();
    controller.subscribe(listener);
    await expect(controller.setLanguage?.('de-AT')).resolves.toBe('de');
    expect(apply).toHaveBeenCalledWith('de-AT');
    expect(currentLanguage()).toBe('de');
    expect(controller.info.language).toBe('de');
    expect(controller.info.title).toBe('Vorführung');
    expect(controller.info.tagline).toBe('A test');
    expect(controller.info.chapters[0]?.paragraphsHtml).toEqual(['Erster <strong>Teil</strong>']);
    expect(controller.getState().phaseLabel).toBe('Rein');
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ phaseLabel: 'Rein' }));
    await expect(controller.setLanguage?.('ru')).resolves.toBe('en');
    expect(controller.info.title).toBe('Demo');
    controller.dispose();
    await expect(controller.setLanguage?.('de')).resolves.toBe('en');
    expect(apply).toHaveBeenCalledTimes(2);
    useEnglishOnly(dictionary);
  });
});
