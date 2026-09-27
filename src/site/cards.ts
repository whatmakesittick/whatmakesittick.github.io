import { DEFAULT_LANGUAGE, currentLanguage, onLanguageChanged, t } from '@core/i18n';
import type { LanguageCode } from '@core/i18n';
import { languagePath } from '@core/i18n/paths';
import { compareNewestFirst } from '@core/manifest';
import type { CatalogueEntry } from '@core/manifest';
import { html, requireElement } from '@core/ui/dom';
import { localizedMeta, pageLanguage } from './catalogue';
import { createCardTags, createTagFilter, showSelection } from './tagChips';
import type { ChooseTag } from './tagChips';
import { filterByTag, readTagQuery, toggleTag, usedTags, writeTagQuery } from './tagFilter';
import type { TagSelection } from './tagFilter';

interface CardView {
  entry: CatalogueEntry;
  element: HTMLElement;
}

const CATALOGUE_SELECTOR = '[data-catalogue]';
const FILTER_SELECTOR = '.tag-filter';

function explainerPath(entry: CatalogueEntry, file = ''): string {
  return `${import.meta.env.BASE_URL}${entry.manifest.slug}/${file}`;
}

function explainerPage(entry: CatalogueEntry, code: LanguageCode): string {
  const language = pageLanguage(entry, code, DEFAULT_LANGUAGE);
  return `${import.meta.env.BASE_URL}${languagePath(language, entry.manifest.slug)}`;
}

function createCard(entry: CatalogueEntry, choose: ChooseTag): CardView | undefined {
  const code = currentLanguage();
  const meta = localizedMeta(entry, code, DEFAULT_LANGUAGE);
  if (!meta) return undefined;
  const cover = html('img', {
    src: explainerPath(entry, entry.manifest.cover),
    alt: meta.title,
    loading: 'lazy',
    decoding: 'async',
  });
  const link = html('a', { class: 'card', href: explainerPage(entry, code) }, [
    html('span', { class: 'card-cover' }, [cover]),
    html('span', { class: 'card-body' }, [
      html('span', { class: 'card-eyebrow' }, [meta.eyebrow]),
      html('h2', { class: 'card-title' }, [meta.title]),
      html('span', { class: 'card-summary' }, [meta.summary]),
    ]),
  ]);
  const footer = html('div', { class: 'card-footer' }, [
    createCardTags(entry.manifest.tags, choose),
  ]);
  const element = html('li', { class: 'card-item' }, [link, footer]);
  return { entry, element };
}

function createPlaceholder(): HTMLElement {
  return html('li', { class: 'card-placeholder' }, [t('catalogue.moreSoon')]);
}

function createCards(entries: readonly CatalogueEntry[], choose: ChooseTag): CardView[] {
  return entries.map((entry) => createCard(entry, choose)).filter((card) => card !== undefined);
}

function createGrid(cards: readonly CardView[]): HTMLElement {
  return html('ul', { class: 'cards' }, [
    ...cards.map(({ element }) => element),
    createPlaceholder(),
  ]);
}

function showCards(cards: readonly CardView[], visible: readonly CatalogueEntry[]): void {
  const shown = new Set(visible);
  cards.forEach(({ entry, element }) => (element.hidden = !shown.has(entry)));
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

export function mountCards(root: Document, entries: readonly CatalogueEntry[]): void {
  const container = requireElement(root, CATALOGUE_SELECTOR);
  const sorted = [...entries].sort(compareNewestFirst);
  const tags = usedTags(sorted);
  let selection = readTagQuery(window.location.search, tags);
  let cards: CardView[] = [];

  const show = () => {
    showSelection(container, selection);
    showCards(cards, filterByTag(sorted, selection));
  };
  const choose: ChooseTag = (choice) => {
    selection = toggleTag(selection, choice);
    storeSelection(selection);
    show();
  };
  const chooseFromCard: ChooseTag = (choice) => {
    choose(choice);
    revealFilter(container);
  };
  const render = () => {
    cards = createCards(sorted, chooseFromCard);
    container.replaceChildren(createTagFilter(tags, choose), createGrid(cards));
    show();
  };

  render();
  storeSelection(selection);
  onLanguageChanged(render);
}
