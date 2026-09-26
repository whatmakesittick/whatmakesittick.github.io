import type { Choice, ExplainerStore, Playback } from '../explainer';
import { html, queryAll, setPressed } from './dom';
import { parseOption } from './parse';
import { watch } from './subscribe';

export function nextOption<S extends Playback>(choice: Choice<S>, state: S): string {
  const values = choice.options.map((option) => option.value);
  const index = values.indexOf(choice.select(state));
  return values[(index + 1) % values.length];
}

export function createChoice<S extends Playback>(choice: Choice<S>): HTMLElement {
  const buttons = choice.options.map((option) =>
    html('button', {
      type: 'button',
      'data-value': option.value,
      'aria-keyshortcuts': choice.shortcut,
      'data-i18n': option.labelKey,
    }),
  );
  return html(
    'div',
    {
      class: 'segmented',
      role: 'group',
      'data-choice': choice.id,
      'data-i18n-attr': `aria-label:${choice.labelKey}`,
    },
    buttons,
  );
}

export function bindChoice<S extends Playback>(
  group: HTMLElement,
  store: ExplainerStore<S>,
  choice: Choice<S>,
): void {
  const values = choice.options.map((option) => option.value);
  const buttons = queryAll<HTMLButtonElement>(group, 'button[data-value]');
  for (const button of buttons) {
    const value = parseOption(button.dataset.value, values);
    button.addEventListener('click', () => choice.apply(store.getState(), value));
  }
  watch(store, choice.select, (current) =>
    buttons.forEach((button) => setPressed(button, button.dataset.value === current)),
  );
}
