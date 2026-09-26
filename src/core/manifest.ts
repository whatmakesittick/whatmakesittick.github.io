import type { LanguageCode } from './i18n/languages.ts';

export const CATEGORIES = [
  'engines',
  'drivetrain',
  'aircraft',
  'electrical',
  'home',
  'tools',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface SocialImage {
  image: string;
  alt: string;
}

export interface ExplainerManifest {
  slug: string;
  category: Category;
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
}
