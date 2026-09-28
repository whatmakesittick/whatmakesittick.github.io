import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import type { ExplainerManifest } from '../src/core/manifest.ts';
import { localizedMeta } from '../src/site/catalogue.ts';
import type { CatalogueCard } from '../src/site/catalogue.ts';
import { coverImage, explainerHref } from '../src/site/catalogueMarkup.ts';
import type { MarkupContext } from '../src/site/catalogueMarkup.ts';
import { element } from '../src/site/html.ts';
import type { Markup } from '../src/site/html.ts';

type PageContext = Pick<MarkupContext, 'code' | 'base'>;

const MORE_EXPLAINERS_COUNT = 3;
const DECORATIVE_ALT = '';

export function pickMoreExplainers(
  cards: readonly CatalogueCard[],
  { slug, tags }: Pick<ExplainerManifest, 'slug' | 'tags'>,
): CatalogueCard[] {
  const sharedTags = ({ manifest }: CatalogueCard) =>
    manifest.tags.filter((tag) => tags.includes(tag)).length;
  return cards
    .filter(({ manifest }) => manifest.slug !== slug)
    .toSorted((a, b) => sharedTags(b) - sharedTags(a))
    .slice(0, MORE_EXPLAINERS_COUNT);
}

function moreExplainer(card: CatalogueCard, { code, base }: PageContext): Markup[] {
  const meta = localizedMeta(card, code, DEFAULT_LANGUAGE);
  if (!meta) return [];
  const link = element('a', { class: 'more-explainer', href: explainerHref(card, code, base) }, [
    element('span', { class: 'more-explainer-cover' }, [
      coverImage(card, DECORATIVE_ALT, base, 'lazy'),
    ]),
    element('span', { class: 'more-explainer-title' }, [meta.title]),
  ]);
  return [element('li', {}, [link])];
}

export function renderMoreExplainers(
  cards: readonly CatalogueCard[],
  context: PageContext,
): string {
  return cards
    .flatMap((card) => moreExplainer(card, context))
    .map(({ html }) => html)
    .join('\n');
}
