import type { ExplainerStore, ViewToggle } from '../explainer';
import { html, queryAll, setPressed, svg } from './dom';
import { parseOption } from './parse';
import { watch } from './subscribe';

const ICON_VIEW_BOX = '0 0 24 24';

function createToggleButton(toggle: ViewToggle): HTMLButtonElement {
  const icon = svg('svg', { class: 'icon', viewBox: ICON_VIEW_BOX, 'aria-hidden': 'true' });
  icon.innerHTML = toggle.icon;
  return html(
    'button',
    {
      type: 'button',
      class: 'toggle',
      'data-view': toggle.view,
      'aria-keyshortcuts': toggle.shortcut,
      'data-i18n-attr': `aria-label:${toggle.nameKey};title:${toggle.hintKey}`,
    },
    [icon, html('span', { class: 'toggle-label', 'data-i18n': toggle.shortKey })],
  );
}

export function createViewToggles(toggles: readonly ViewToggle[]): HTMLElement {
  return html(
    'div',
    { class: 'toggles', role: 'group', 'data-i18n-attr': 'aria-label:controls.viewOptions' },
    toggles.map(createToggleButton),
  );
}

export function bindViewToggles(
  group: HTMLElement,
  store: ExplainerStore,
  toggles: readonly ViewToggle[],
): void {
  const views = toggles.map((toggle) => toggle.view);
  for (const button of queryAll<HTMLButtonElement>(group, '[data-view]')) {
    const view = parseOption(button.dataset.view, views);
    button.addEventListener('click', () => store.getState().toggleView(view));
    watch(
      store,
      (state) => state.view[view],
      (enabled) => setPressed(button, enabled),
    );
  }
}
