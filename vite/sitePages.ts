import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import { loadAbout } from './about.ts';
import type { LoadedAbout } from './about.ts';
import type { CatalogueCard } from '../src/site/catalogue.ts';
import { loadCoreDictionaries, mergeLocales, pageLanguage } from './i18n.ts';
import type { Dictionaries } from './i18n.ts';
import { loadExplainers } from './manifest.ts';
import type { LoadedExplainer } from './manifest.ts';
import { pickMoreExplainers } from './moreExplainers.ts';
import {
  PAGE_ENTRY,
  catalogueCards,
  renderAbout,
  renderCatalogue,
  renderEntry,
  renderNotFound,
  renderPage,
} from './page.ts';
import { prunePageFolders, writePageFolder } from './pageFolders.ts';
import type { PageFiles } from './pageFolders.ts';
import { ABOUT_ROUTE, CATALOGUE_ROUTE, pageFolder } from './routes.ts';
import type { TemplateValues } from './template.ts';

export const CORE_DIRECTORY = join('src', 'core');
export const SITE_DIRECTORY = join('src', 'site');
export const SITE_ENTRY = 'index.html';
export const NOT_FOUND_ENTRY = '404.html';

const PAGE_TEMPLATE = join(CORE_DIRECTORY, 'page.html');
const PARTIALS_DIRECTORY = join(CORE_DIRECTORY, 'partials');
const PARTIAL_EXTENSION = '.html';

interface Sources {
  pageTemplate: string;
  siteTemplate: string;
  partials: TemplateValues;
  core: Dictionaries;
  about: LoadedAbout;
}

interface PageFolder {
  path: string;
  files: PageFiles;
}

export interface Site {
  explainers: LoadedExplainer[];
  sources: Sources;
  folders: string[];
}

function readPartials(root: string): TemplateValues {
  const directory = join(root, PARTIALS_DIRECTORY);
  return Object.fromEntries(
    readdirSync(directory)
      .filter((file) => file.endsWith(PARTIAL_EXTENSION))
      .map((file) => [
        basename(file, PARTIAL_EXTENSION),
        readFileSync(join(directory, file), 'utf8'),
      ]),
  );
}

function readSources(root: string): Sources {
  return {
    pageTemplate: readFileSync(join(root, PAGE_TEMPLATE), 'utf8'),
    siteTemplate: readFileSync(join(root, SITE_ENTRY), 'utf8'),
    partials: readPartials(root),
    core: loadCoreDictionaries(root),
    about: loadAbout(root),
  };
}

function catalogueFolders(sources: Sources, explainers: LoadedExplainer[]): PageFolder[] {
  return CATALOGUE_ROUTE.languages
    .filter((code) => code !== DEFAULT_LANGUAGE)
    .map((code) => ({
      path: pageFolder(code, CATALOGUE_ROUTE.page),
      files: {
        [SITE_ENTRY]: renderCatalogue(
          sources.siteTemplate,
          sources.partials,
          explainers,
          pageLanguage(sources.core, code),
        ),
      },
    }));
}

function aboutFolders({ about, partials, core }: Sources): PageFolder[] {
  const dictionaries = mergeLocales(core, about.dictionaries);
  return ABOUT_ROUTE.languages.map((code) => ({
    path: pageFolder(code, ABOUT_ROUTE.page),
    files: {
      [SITE_ENTRY]: renderAbout(about, partials, pageLanguage(dictionaries, code)),
    },
  }));
}

function explainerFolders(
  sources: Sources,
  explainer: LoadedExplainer,
  cards: readonly CatalogueCard[],
): PageFolder[] {
  const { manifest } = explainer;
  const dictionaries = mergeLocales(sources.core, explainer.dictionaries);
  const moreExplainers = pickMoreExplainers(cards, manifest);
  const entry = { [PAGE_ENTRY]: renderEntry(manifest) };
  return manifest.locales.map((code) => ({
    path: pageFolder(code, manifest.slug),
    files: {
      [SITE_ENTRY]: renderPage(
        sources.pageTemplate,
        sources.partials,
        explainer,
        pageLanguage(dictionaries, code),
        moreExplainers,
      ),
      ...(code === DEFAULT_LANGUAGE ? entry : {}),
    },
  }));
}

export function generateSite(root: string): Site {
  const explainers = loadExplainers(root);
  const sources = readSources(root);
  const cards = catalogueCards(explainers);
  const folders = [
    ...catalogueFolders(sources, explainers),
    ...aboutFolders(sources),
    ...explainers.flatMap((explainer) => explainerFolders(sources, explainer, cards)),
  ];
  for (const { path, files } of folders) writePageFolder(root, path, files);
  const paths = folders.map(({ path }) => path);
  prunePageFolders(root, paths);
  return { explainers, sources, folders: paths };
}

export function renderSiteEntry(html: string, { sources, explainers }: Site): string {
  const language = pageLanguage(sources.core, DEFAULT_LANGUAGE);
  return renderCatalogue(html, sources.partials, explainers, language);
}

export function renderNotFoundEntry(html: string, { sources }: Site): string {
  return renderNotFound(html, sources.partials, pageLanguage(sources.core, DEFAULT_LANGUAGE));
}
