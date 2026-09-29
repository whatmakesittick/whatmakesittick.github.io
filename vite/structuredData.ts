import { LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { ExplainerMeta } from '../src/core/manifest.ts';
import type { PageDates } from './dates.ts';
import { AUTHOR, COVER_SIZE, SITE_NAME, SITE_SOCIAL, SOCIAL_IMAGE_SIZE, siteUrl } from './site.ts';

const CONTEXT = 'https://schema.org';
const WEBSITE_ID = siteUrl('#website');
const BREADCRUMB_FRAGMENT = '#breadcrumb';
const EXPLAINERS_FRAGMENT = '#explainers';

export interface PageFacts {
  code: LanguageCode;
  url: string;
  image: string;
}

export interface ListedPage {
  name: string;
  url: string;
}

export interface ExplainerFacts extends PageFacts {
  cover: string;
  catalogue: ListedPage;
}

export interface PageCopy {
  name: string;
  description: string;
}

interface ImageSize {
  width: number;
  height: number;
}

function author() {
  return { '@type': 'Person', ...AUTHOR };
}

function imageObject(url: string, size: ImageSize) {
  return { '@type': 'ImageObject', url, ...size };
}

function reference(id: string) {
  return { '@id': id };
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: siteUrl(),
    image: siteUrl(SITE_SOCIAL.image),
    inLanguage: LANGUAGES.map((language) => language.code),
    author: author(),
  };
}

function listItems(pages: readonly ListedPage[], link: 'item' | 'url') {
  return pages.map((page, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: page.name,
    [link]: page.url,
  }));
}

function breadcrumbList(id: string, trail: readonly ListedPage[]) {
  return { '@type': 'BreadcrumbList', '@id': id, itemListElement: listItems(trail, 'item') };
}

export function explainerData(
  meta: ExplainerMeta,
  facts: ExplainerFacts,
  dates: PageDates,
): object {
  const breadcrumbId = `${facts.url}${BREADCRUMB_FRAGMENT}`;
  return {
    '@context': CONTEXT,
    '@graph': [
      website(),
      {
        '@type': ['WebPage', 'TechArticle'],
        '@id': facts.url,
        name: meta.title,
        headline: meta.title,
        description: meta.description,
        url: facts.url,
        image: [imageObject(facts.image, SOCIAL_IMAGE_SIZE), imageObject(facts.cover, COVER_SIZE)],
        inLanguage: facts.code,
        datePublished: dates.published,
        dateModified: dates.modified,
        author: author(),
        isPartOf: reference(WEBSITE_ID),
        breadcrumb: reference(breadcrumbId),
      },
      breadcrumbList(breadcrumbId, [facts.catalogue, { name: meta.title, url: facts.url }]),
    ],
  };
}

export function aboutData(
  copy: PageCopy,
  facts: PageFacts,
  dates: PageDates,
  catalogue: ListedPage,
): object {
  const breadcrumbId = `${facts.url}${BREADCRUMB_FRAGMENT}`;
  return {
    '@context': CONTEXT,
    '@graph': [
      website(),
      {
        '@type': ['WebPage', 'AboutPage'],
        '@id': facts.url,
        name: copy.name,
        description: copy.description,
        url: facts.url,
        image: facts.image,
        inLanguage: facts.code,
        datePublished: dates.published,
        dateModified: dates.modified,
        author: author(),
        isPartOf: reference(WEBSITE_ID),
        about: reference(WEBSITE_ID),
        breadcrumb: reference(breadcrumbId),
      },
      breadcrumbList(breadcrumbId, [catalogue, { name: copy.name, url: facts.url }]),
    ],
  };
}

function itemList(id: string, pages: readonly ListedPage[]) {
  return {
    '@type': 'ItemList',
    '@id': id,
    numberOfItems: pages.length,
    itemListElement: listItems(pages, 'url'),
  };
}

export function catalogueData(
  copy: PageCopy,
  facts: PageFacts,
  pages: readonly ListedPage[],
): object {
  const listId = `${facts.url}${EXPLAINERS_FRAGMENT}`;
  return {
    '@context': CONTEXT,
    '@graph': [
      website(),
      {
        '@type': 'CollectionPage',
        '@id': facts.url,
        name: copy.name,
        description: copy.description,
        url: facts.url,
        image: facts.image,
        inLanguage: facts.code,
        isPartOf: reference(WEBSITE_ID),
        mainEntity: reference(listId),
      },
      itemList(listId, pages),
    ],
  };
}
