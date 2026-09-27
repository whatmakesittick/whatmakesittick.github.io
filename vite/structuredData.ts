import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { ExplainerMeta } from '../src/core/manifest.ts';
import { AUTHOR, SITE_NAME } from './site.ts';

const CONTEXT = 'https://schema.org';

export interface PageFacts {
  code: LanguageCode;
  url: string;
  image: string;
}

function author() {
  return { '@type': 'Person', ...AUTHOR };
}

export function explainerData(meta: ExplainerMeta, facts: PageFacts): object {
  return {
    '@context': CONTEXT,
    '@type': ['WebPage', 'TechArticle'],
    name: meta.title,
    headline: meta.title,
    description: meta.description,
    url: facts.url,
    image: facts.image,
    inLanguage: facts.code,
    author: author(),
  };
}

export function catalogueData(description: string, facts: PageFacts): object {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: SITE_NAME,
    description,
    url: facts.url,
    image: facts.image,
    inLanguage: facts.code,
    author: author(),
  };
}
