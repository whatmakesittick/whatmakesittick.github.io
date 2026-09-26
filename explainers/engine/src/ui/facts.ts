import { onLanguageChanged, t } from '@core/i18n';
import { queryAll } from '@core/ui/dom';
import { describeFiringOrder } from './diagrams/firingOrder';

const FIRING_ORDER_KEY = 'sections.inline4.p3';

function fillFiringOrder(elements: HTMLElement[]): void {
  const text = t(FIRING_ORDER_KEY, { firingOrder: describeFiringOrder() });
  elements.forEach((element) => (element.innerHTML = text));
}

export function fillModelFacts(root: Document): void {
  const elements = queryAll(root, '[data-firing-order]');
  fillFiringOrder(elements);
  onLanguageChanged(() => fillFiringOrder(elements));
}
