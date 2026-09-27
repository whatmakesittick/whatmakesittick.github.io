import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { ExplainerMeta } from '../src/core/manifest.ts';
import type { PageDates } from './dates.ts';
import { AUTHOR, SITE_NAME } from './site.ts';

const CONTEXT = 'https://schema.org';

export interface PageFacts {
  code: LanguageCode;
  url: string;
  image: string;
}

export interface ListedPage {
  name: string;
  url: string;
}

function author() {
  return { '@type': 'Person', ...AUTHOR };
}

export function explainerData(meta: ExplainerMeta, facts: PageFacts, dates: PageDates): object {
  return {
    '@context': CONTEXT,
    '@type': ['WebPage', 'TechArticle'],
    name: meta.title,
    headline: meta.title,
    description: meta.description,
    url: facts.url,
    image: facts.image,
    inLanguage: facts.code,
    datePublished: dates.published,
    dateModified: dates.modified,
    author: author(),
  };
}

function itemList(pages: readonly ListedPage[]) {
  return {
    '@type': 'ItemList',
    numberOfItems: pages.length,
    itemListElement: pages.map((page, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: page.name,
      url: page.url,
    })),
  };
}

export function catalogueData(
  description: string,
  facts: PageFacts,
  pages: readonly ListedPage[],
): object {
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        description,
        url: facts.url,
        image: facts.image,
        inLanguage: facts.code,
        author: author(),
      },
      itemList(pages),
    ],
  };
}
