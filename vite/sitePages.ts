import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import { loadCoreDictionaries, mergeLocales, pageLanguage } from './i18n.ts';
import type { Dictionaries } from './i18n.ts';
import { loadExplainers } from './manifest.ts';
import type { LoadedExplainer } from './manifest.ts';
import { PAGE_ENTRY, renderCatalogue, renderEntry, renderPage } from './page.ts';
import { prunePageFolders, writePageFolder } from './pageFolders.ts';
import type { PageFiles } from './pageFolders.ts';
import { CATALOGUE_ROUTE, pageFolder } from './routes.ts';
import type { TemplateValues } from './template.ts';

export const CORE_DIRECTORY = join('src', 'core');
export const SITE_ENTRY = 'index.html';

const PAGE_TEMPLATE = join(CORE_DIRECTORY, 'page.html');
const PARTIALS_DIRECTORY = join(CORE_DIRECTORY, 'partials');
const PARTIAL_EXTENSION = '.html';

interface Sources {
  pageTemplate: string;
  siteTemplate: string;
  partials: TemplateValues;
  core: Dictionaries;
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

function explainerFolders(sources: Sources, explainer: LoadedExplainer): PageFolder[] {
  const { manifest } = explainer;
  const dictionaries = mergeLocales(sources.core, explainer.dictionaries);
  const entry = { [PAGE_ENTRY]: renderEntry(manifest) };
  return manifest.locales.map((code) => ({
    path: pageFolder(code, manifest.slug),
    files: {
      [SITE_ENTRY]: renderPage(
        sources.pageTemplate,
        sources.partials,
        explainer,
        pageLanguage(dictionaries, code),
      ),
      ...(code === DEFAULT_LANGUAGE ? entry : {}),
    },
  }));
}

export function generateSite(root: string): Site {
  const explainers = loadExplainers(root);
  const sources = readSources(root);
  const folders = [
    ...catalogueFolders(sources, explainers),
    ...explainers.flatMap((explainer) => explainerFolders(sources, explainer)),
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
