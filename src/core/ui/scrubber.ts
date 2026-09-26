import type { ExplainerStore, Timeline } from '../explainer';
import { t } from '../i18n';
import { html, setAttributes, setPressed, setText } from './dom';
import { phaseAt, phaseBands, phaseShortcut } from './phases';
import { watch, watchLocalized } from './subscribe';
import { TEXT_REFRESH_INTERVAL_MS, throttle } from './throttle';

const BANDS_PROPERTY = '--phase-bands';
const TONE_PROPERTY = '--tone';

export function bindScrubber(
  input: HTMLInputElement,
  store: ExplainerStore,
  timeline: Timeline,
): void {
  setAttributes(input, { min: 0, max: timeline.cycle - timeline.step, step: timeline.step });
  input.style.setProperty(BANDS_PROPERTY, phaseBands(timeline));

  input.addEventListener('pointerdown', () => store.getState().pause());
  input.addEventListener('input', () => {
    const state = store.getState();
    state.pause();
    state.setPhase(Number(input.value));
  });

  const render = throttle((phase: number) => {
    input.value = String(Math.round(phase / timeline.step) * timeline.step);
    input.setAttribute('aria-valuetext', timeline.describePhase(phase));
  }, TEXT_REFRESH_INTERVAL_MS);
  watchLocalized(store, (state) => state.phase, render);
}

export function createPhaseButtons(timeline: Timeline): HTMLButtonElement[] {
  return timeline.phases.map((phase, index) =>
    html('button', {
      type: 'button',
      'data-phase': phase.id,
      'aria-keyshortcuts': phaseShortcut(index),
      'data-i18n': phase.labelKey,
      'data-i18n-attr': `aria-label:${phase.jumpLabelKey}`,
      style: `${TONE_PROPERTY}: ${phase.tone}`,
    }),
  );
}

export function bindPhaseButtons(
  buttons: HTMLButtonElement[],
  store: ExplainerStore,
  timeline: Timeline,
): void {
  for (const button of buttons) {
    const id = button.dataset.phase ?? '';
    button.addEventListener('click', () => store.getState().jumpToPhase(id));
  }
  watch(
    store,
    (state) => phaseAt(timeline, state.phase).id,
    (current) => buttons.forEach((button) => setPressed(button, button.dataset.phase === current)),
  );
}

export function bindPhaseStatus(
  value: HTMLElement,
  name: HTMLElement,
  store: ExplainerStore,
  timeline: Timeline,
): void {
  const render = throttle((phase: number) => {
    const current = phaseAt(timeline, phase);
    setText(value, timeline.formatPhase(phase));
    setText(name, t(current.labelKey));
    name.style.setProperty(TONE_PROPERTY, current.tone);
  }, TEXT_REFRESH_INTERVAL_MS);
  watchLocalized(store, (state) => state.phase, render);
}
