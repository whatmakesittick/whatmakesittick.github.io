import type { Explainer, ExplainerStore, Playback } from '../explainer';
import { t } from '../i18n';
import { requireElement } from './dom';
import { bindChoice, createChoice } from './choices';
import { phaseColumns } from './phases';
import { bindPhaseButtons, bindPhaseStatus, bindScrubber, createPhaseButtons } from './scrubber';
import { bindSpeedSlider } from './speedSlider';
import { watchLocalized } from './subscribe';
import { bindViewToggles, createViewToggles } from './viewToggles';

const PHASE_COLUMNS_PROPERTY = '--phase-columns';
const PLAY_KEY = 'controls.play';
const PAUSE_KEY = 'controls.pause';

function bindPlayButton(button: HTMLButtonElement, store: ExplainerStore): void {
  button.addEventListener('click', () => store.getState().togglePlaying());
  watchLocalized(
    store,
    (state) => state.playing,
    (playing) => {
      const key = playing ? PAUSE_KEY : PLAY_KEY;
      button.dataset.playing = String(playing);
      button.dataset.i18nAttr = `aria-label:${key}`;
      button.setAttribute('aria-label', t(key));
    },
  );
}

function bindCameraReset(button: HTMLButtonElement, store: ExplainerStore): void {
  button.addEventListener('click', () => store.getState().resetCamera());
}

function bindDisclosure(dock: HTMLElement, button: HTMLButtonElement): void {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    dock.dataset.expanded = String(expanded);
  });
}

function mountPlayback<S extends Playback>(
  dock: HTMLElement,
  store: ExplainerStore<S>,
  explainer: Explainer<S>,
): void {
  const { timeline } = explainer;
  const find = <T extends HTMLElement>(selector: string) => requireElement<T>(dock, selector);
  const phaseGroup = find('[data-phase-buttons]');
  const phaseButtons = createPhaseButtons(timeline);
  phaseGroup.replaceChildren(...phaseButtons);
  phaseGroup.style.setProperty(PHASE_COLUMNS_PROPERTY, phaseColumns(timeline));
  phaseGroup.dataset.i18nAttr = `aria-label:${timeline.phasesLabelKey}`;
  find('[data-scrubber-label]').dataset.i18n = timeline.labelKey;
  find('[data-speed-label]').dataset.i18n = timeline.speed.labelKey;

  bindPlayButton(find<HTMLButtonElement>('[data-control="play"]'), store);
  bindScrubber(find<HTMLInputElement>('[data-control="scrubber"]'), store, timeline);
  bindPhaseButtons(phaseButtons, store, timeline);
  bindPhaseStatus(find('[data-status="phase"]'), find('[data-status="name"]'), store, timeline);
  bindSpeedSlider(
    find<HTMLInputElement>('[data-control="speed"]'),
    find('[data-speed-value]'),
    store,
    timeline.speed,
  );
}

function mountExtras<S extends Playback>(
  dock: HTMLElement,
  store: ExplainerStore<S>,
  explainer: Explainer<S>,
): void {
  const { choices, toggles } = explainer.dock;
  const groups = choices.map((choice) => {
    const group = createChoice(choice);
    bindChoice(group, store, choice);
    return group;
  });
  if (toggles.length > 0) {
    const group = createViewToggles(toggles);
    bindViewToggles(group, store, toggles);
    groups.push(group);
  }
  requireElement(dock, '[data-speed-field]').after(...groups);
}

export function mountDock<S extends Playback>(
  root: Document,
  store: ExplainerStore<S>,
  explainer: Explainer<S>,
): void {
  const dock = requireElement(root, '[data-dock]');
  mountPlayback(dock, store, explainer);
  mountExtras(dock, store, explainer);
  bindCameraReset(requireElement<HTMLButtonElement>(dock, '[data-control="reset-camera"]'), store);
  bindDisclosure(dock, requireElement<HTMLButtonElement>(dock, '[data-control="more"]'));
  dock.style.removeProperty('visibility');
}
