import type { LanguageCode } from './i18n/languages.ts';

export const TAGS = [
  'mechanics',
  'engines',
  'vehicles',
  'aircraft',
  'flight',
  'physics',
  'weather',
  'home',
  'tools',
  'optics',
  'energy',
  'earth',
] as const;

export type Tag = (typeof TAGS)[number];

export interface SocialImage {
  image: string;
  alt: string;
}

export interface ExplainerManifest {
  slug: string;
  tags: Tag[];
  cover: string;
  entry: string;
  chapters: string;
  locales: LanguageCode[];
  social: SocialImage;
}

export interface ExplainerMeta {
  title: string;
  eyebrow: string;
  tagline: string;
  description: string;
  summary: string;
}

export const META_KEYS: readonly (keyof ExplainerMeta)[] = [
  'title',
  'eyebrow',
  'tagline',
  'description',
  'summary',
];

export interface CatalogueEntry {
  manifest: ExplainerManifest;
  meta: Partial<Record<LanguageCode, ExplainerMeta>>;
  published: string;
}

export function compareNewestFirst(a: CatalogueEntry, b: CatalogueEntry): number {
  const age = Date.parse(b.published) - Date.parse(a.published);
  return age || a.manifest.slug.localeCompare(b.manifest.slug);
}
