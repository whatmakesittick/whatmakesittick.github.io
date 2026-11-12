import { DEFAULT_LANGUAGE, currentLanguage, onLanguageChanged, t } from '@core/i18n';
import type { LanguageCode } from '@core/i18n';
import { queryAll, requireElement } from '@core/ui/dom';
import type { CardMetaLoader, CardMetas, CatalogueCard } from './catalogue';
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

function render(
  container: HTMLElement,
  cards: readonly CatalogueCard[],
  metas: CardMetas,
  code: LanguageCode,
): void {
  const context = { code, base: import.meta.env.BASE_URL, translate: (key: string) => t(key) };
  container.innerHTML = renderCatalogueGrid(cards, metas, context);
}

async function loadMetas(load: CardMetaLoader, code: LanguageCode): Promise<CardMetas> {
  const [localized, fallback] = await Promise.all([load(code), load(DEFAULT_LANGUAGE)]);
  return { [DEFAULT_LANGUAGE]: fallback, [code]: localized };
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

export async function mountCards(
  root: Document,
  cards: readonly CatalogueCard[],
  load: CardMetaLoader,
): Promise<void> {
  const container = requireElement(root, CATALOGUE_SELECTOR);
  const tags = usedTags(cards);
  let selection = readTagQuery(window.location.search, tags);

  const show = () => {
    showSelection(container, selection);
    showCards(container, filterByTag(cards, selection));
  };
  let latestRequest = 0;
  const renderIn = async (code: LanguageCode) => {
    const request = ++latestRequest;
    const metas = await loadMetas(load, code);
    if (request !== latestRequest) return;
    render(container, cards, metas, code);
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

  onLanguageChanged((code) => void renderIn(code));
  const needsRender = renderedLanguage(container) !== currentLanguage();
  if (needsRender) await renderIn(currentLanguage());
  else show();
  storeSelection(selection);
}
