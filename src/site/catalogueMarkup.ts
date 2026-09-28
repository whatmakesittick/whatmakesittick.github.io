import { DEFAULT_LANGUAGE } from '../core/i18n/languages.ts';
import type { LanguageCode } from '../core/i18n/languages.ts';
import { languagePath } from '../core/i18n/paths.ts';
import type { Tag } from '../core/manifest.ts';
import { localizedMeta, pageLanguage } from './catalogue.ts';
import type { CardMeta, CatalogueCard } from './catalogue.ts';
import { element } from './html.ts';
import type { Markup } from './html.ts';
import type { TagSelection } from './tagFilter.ts';
import { usedTags } from './tagFilter.ts';

export interface MarkupContext {
  code: LanguageCode;
  base: string;
  translate: (key: string) => string;
}

export type CoverLoading = 'eager' | 'lazy';

export const COVER_SIZE = { width: 932, height: 699 } as const;
export const ALL_TAGS_VALUE = '';

const CHIP_CLASS = 'tag-chip';
const FILTER_CLASS = 'tag-filter';
const CARD_TAGS_CLASS = 'card-tags';
const CARD_ITEM_CLASS = 'card-item';
const GRID_CLASS = 'cards';

export const CHIP_SELECTOR = `.${CHIP_CLASS}`;
export const FILTER_SELECTOR = `.${FILTER_CLASS}`;
export const CARD_TAGS_SELECTOR = `.${CARD_TAGS_CLASS}`;
export const CARD_ITEM_SELECTOR = `.${CARD_ITEM_CLASS}`;
export const GRID_SELECTOR = `.${GRID_CLASS}`;

const EAGER_COVERS = 3;
const ALL_TAGS_KEY = 'catalogue.allTags';
const FILTER_LABEL_KEY = 'catalogue.filterLabel';
const MORE_SOON_KEY = 'catalogue.moreSoon';
const COVER_LOADING: Record<CoverLoading, Record<string, string>> = {
  eager: { fetchpriority: 'high' },
  lazy: { loading: 'lazy' },
};

interface ListedCard {
  card: CatalogueCard;
  meta: CardMeta;
}

export function explainerHref(card: CatalogueCard, code: LanguageCode, base: string): string {
  const language = pageLanguage(card, code, DEFAULT_LANGUAGE);
  return `${base}${languagePath(language, card.manifest.slug)}`;
}

export function coverImage(
  card: CatalogueCard,
  alt: string,
  base: string,
  loading: CoverLoading,
): Markup {
  return element('img', {
    src: `${base}${card.manifest.slug}/${card.manifest.cover}`,
    alt,
    width: COVER_SIZE.width,
    height: COVER_SIZE.height,
    decoding: 'async',
    ...COVER_LOADING[loading],
  });
}

function tagChip(choice: TagSelection, pressed: boolean, { translate }: MarkupContext): Markup {
  const label =
    choice === undefined ? translate(ALL_TAGS_KEY) : translate(`catalogue.tags.${choice}`);
  const attributes = {
    type: 'button',
    class: CHIP_CLASS,
    'data-tag': choice ?? ALL_TAGS_VALUE,
    'aria-pressed': String(pressed),
  };
  return element('button', attributes, [label]);
}

function tagFilter(tags: readonly Tag[], context: MarkupContext): Markup {
  const chips = [undefined, ...tags].map((choice) =>
    tagChip(choice, choice === undefined, context),
  );
  const attributes = {
    class: FILTER_CLASS,
    role: 'group',
    'aria-label': context.translate(FILTER_LABEL_KEY),
  };
  return element('div', attributes, chips);
}

function cardTags(tags: readonly Tag[], context: MarkupContext): Markup {
  const items = tags.map((tag) => element('li', {}, [tagChip(tag, false, context)]));
  const attributes = { class: CARD_TAGS_CLASS, 'aria-label': context.translate(FILTER_LABEL_KEY) };
  return element('ul', attributes, items);
}

function cardLink(
  { card, meta }: ListedCard,
  loading: CoverLoading,
  context: MarkupContext,
): Markup {
  const href = explainerHref(card, context.code, context.base);
  return element('a', { class: 'card', href }, [
    element('span', { class: 'card-cover' }, [coverImage(card, meta.title, context.base, loading)]),
    element('span', { class: 'card-body' }, [
      element('span', { class: 'card-eyebrow' }, [meta.eyebrow]),
      element('h2', { class: 'card-title' }, [meta.title]),
      element('span', { class: 'card-summary' }, [meta.summary]),
    ]),
  ]);
}

function cardItem(listed: ListedCard, index: number, context: MarkupContext): Markup {
  const { manifest } = listed.card;
  const link = cardLink(listed, index < EAGER_COVERS ? 'eager' : 'lazy', context);
  const footer = element('div', { class: 'card-footer' }, [cardTags(manifest.tags, context)]);
  return element('li', { class: CARD_ITEM_CLASS, 'data-slug': manifest.slug }, [link, footer]);
}

function listedCards(cards: readonly CatalogueCard[], code: LanguageCode): ListedCard[] {
  return cards.flatMap((card) => {
    const meta = localizedMeta(card, code, DEFAULT_LANGUAGE);
    return meta ? [{ card, meta }] : [];
  });
}

export function renderCatalogueGrid(
  cards: readonly CatalogueCard[],
  context: MarkupContext,
): string {
  const items = listedCards(cards, context.code).map((listed, index) =>
    cardItem(listed, index, context),
  );
  const placeholder = element('li', { class: 'card-placeholder' }, [
    context.translate(MORE_SOON_KEY),
  ]);
  const grid = element('ul', { class: GRID_CLASS, 'data-language': context.code }, [
    ...items,
    placeholder,
  ]);
  return `${tagFilter(usedTags(cards), context).html}\n${grid.html}`;
}
