import type { ExplainerStore, SpeedScale } from '../explainer';
import { t } from '../i18n';
import { html } from './dom';
import { configureRange, showRangeValue } from './range';
import { watchLocalized } from './subscribe';

const SPEED_VALUE_KEY = 'controls.speedValue';

function fitsWithin(container: HTMLElement): boolean {
  return container.scrollWidth <= container.clientWidth;
}

function describeSpeed(scale: SpeedScale, speed: number): string {
  return t(SPEED_VALUE_KEY, { value: scale.format(speed), description: scale.describe(speed) });
}

export function bindSpeedSlider(
  input: HTMLInputElement,
  output: HTMLElement,
  store: ExplainerStore,
  scale: SpeedScale,
): void {
  configureRange(input, scale);
  const value = html('span', { class: 'field-value-number' });
  const note = html('span', { class: 'field-value-note' });
  output.replaceChildren(value, note);

  const fitNote = () => {
    note.hidden = false;
    note.hidden = !fitsWithin(output);
  };
  let fitPending = false;
  const fitNextFrame = () => {
    if (fitPending) return;
    fitPending = true;
    requestAnimationFrame(() => {
      fitPending = false;
      fitNote();
    });
  };
  new ResizeObserver(fitNote).observe(output.parentElement ?? output);

  input.addEventListener('input', () => store.getState().setSpeed(Number(input.value)));
  watchLocalized(
    store,
    (state) => state.speed,
    (speed) => {
      showRangeValue(input, speed, describeSpeed(scale, speed));
      value.textContent = scale.format(speed);
      note.textContent = scale.describe(speed);
      fitNextFrame();
    },
  );
}
