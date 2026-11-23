import { onLanguageChanged } from '@core/i18n';
import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { PACE_IDS } from '../ids';
import type { PaceId } from '../ids';
import { paceOptionText } from './text';

const CHOICE_SELECTOR = '[data-choice="pace"]';
const OBSERVED = { childList: true, subtree: true, characterData: true } as const;

function paceButtons(group: Element): readonly [PaceId, Element][] {
  return PACE_IDS.flatMap((id) => {
    const button = group.querySelector(`button[data-value="${id}"]`);
    return button ? [[id, button] as const] : [];
  });
}

function fill(group: Element): void {
  for (const [id, button] of paceButtons(group)) {
    const text = paceOptionText(id);
    if (button.textContent !== text) button.textContent = text;
  }
}

export function mountPaceLabels(anchor: HTMLElement): Disposer {
  const root = anchor.getRootNode() as ParentNode;
  const group = root.querySelector(CHOICE_SELECTOR);
  if (!group) return () => {};
  const observer = new MutationObserver(() => fill(group));
  fill(group);
  observer.observe(group, OBSERVED);
  return disposeAll([() => observer.disconnect(), onLanguageChanged(() => fill(group))]);
}
