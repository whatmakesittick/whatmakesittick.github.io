import { currentLanguage, onLanguageChanged, t } from '@core/i18n';
import type { LanguageCode } from '@core/i18n';
import { queryAll, requireElement } from '@core/ui/dom';
import type { CatalogueCard } from './catalogue';
import {
  CARD_ITEM_SELECTOR,
  CARD_TAGS_SELECTOR,
  CHIP_SELECTOR,
  FILTER_SELECTOR,
  GRID_SELECTOR,
  renderCatalogueGrid,
} from './catalogueMarkup';
import { chipChoice, showSelection } from './tagChips';
import { filterByTag, readTagQuery, toggleTag, usedTags, writeTagQuery } from './tagFilter';
import type { TagSelection } from './tagFilter';

const CATALOGUE_SELECTOR = '[data-catalogue]';

function renderedLanguage(container: HTMLElement): string | undefined {
  return container.querySelector<HTMLElement>(GRID_SELECTOR)?.dataset.language;
}

function render(container: HTMLElement, cards: readonly CatalogueCard[], code: LanguageCode): void {
  const context = { code, base: import.meta.env.BASE_URL, translate: (key: string) => t(key) };
  container.innerHTML = renderCatalogueGrid(cards, context);
}

function showCards(container: HTMLElement, visible: readonly CatalogueCard[]): void {
  const shown = new Set(visible.map(({ manifest }) => manifest.slug));
  queryAll(container, CARD_ITEM_SELECTOR).forEach(
    (item) => (item.hidden = !shown.has(item.dataset.slug ?? '')),
  );
}

function storeSelection(selection: TagSelection): void {
  const url = new URL(window.location.href);
  url.search = writeTagQuery(url.search, selection);
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
}

function revealFilter(container: HTMLElement): void {
  const filter = container.querySelector(FILTER_SELECTOR);
  if (filter && filter.getBoundingClientRect().top < 0) filter.scrollIntoView({ block: 'start' });
}

function clickedChip(event: Event): HTMLElement | undefined {
  const target = event.target instanceof Element ? event.target : null;
  return target?.closest<HTMLElement>(CHIP_SELECTOR) ?? undefined;
}

export function mountCards(root: Document, cards: readonly CatalogueCard[]): void {
  const container = requireElement(root, CATALOGUE_SELECTOR);
  const tags = usedTags(cards);
  let selection = readTagQuery(window.location.search, tags);

  const show = () => {
    showSelection(container, selection);
    showCards(container, filterByTag(cards, selection));
  };
  const renderIn = (code: LanguageCode) => {
    render(container, cards, code);
    show();
  };

  container.addEventListener('click', (event) => {
    const chip = clickedChip(event);
    if (!chip) return;
    selection = toggleTag(selection, chipChoice(chip, tags));
    storeSelection(selection);
    show();
    if (chip.closest(CARD_TAGS_SELECTOR)) revealFilter(container);
  });

  if (renderedLanguage(container) === currentLanguage()) show();
  else renderIn(currentLanguage());
  storeSelection(selection);
  onLanguageChanged(renderIn);
}
