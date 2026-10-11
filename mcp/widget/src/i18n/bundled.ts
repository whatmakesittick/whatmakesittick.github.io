import english from 'virtual:wmit-catalogue';
import sources from 'virtual:wmit-languages';
import type { BakedCatalogue } from '../../../shared/catalogue.ts';
import { createPacks, type LanguageSources } from './packs.ts';

export const bundledPacks = () =>
  createPacks(english as BakedCatalogue, sources as LanguageSources);
