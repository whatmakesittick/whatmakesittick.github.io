const en = {
  brand: 'What makes it tick',
  openOnSite: 'Open on site',
  openOnSiteShort: 'Site',
  fullscreen: 'Show the model full screen',
  exitFullscreen: 'Exit fullscreen',
  chapterIndex: (n: string, total: string) => `Chapter ${n} / ${total}`,
  prevChapter: 'Previous chapter',
  nextChapter: 'Next chapter',
  readMore: 'Read more',
  readLess: 'Show less',
  nextNamed: (chapter: string) => `Next: ${chapter}`,
  exploreMore: 'More explainers',
  count: (n: number) => `${n} explainers`,
  watching: 'Watching',
  scrollLeft: 'Scroll left',
  scrollRight: 'Scroll right',
  chapters: 'Chapters',
  loading: {
    title: 'Building the 3D scene',
    body: 'The model is drawn in your browser.',
    progress: 'Loading 3D model',
  },
  noWebgl: {
    title: "3D isn't available here",
    body: "This chat can't run WebGL, so you're seeing a still. The chapters below still work.",
    cta: 'Open the 3D version',
    chip: 'Still image',
  },
  error: {
    title: "The 3D scene didn't load",
    body: "The model files couldn't be fetched. Check your connection and try again.",
    retry: 'Try again',
  },
  unknown: 'Pick an explainer',
  chapterOnSite: 'The full text of this chapter is on the site.',
};

type Widen<T> = T extends (...args: infer A) => string
  ? (...args: A) => string
  : T extends object
    ? { readonly [K in keyof T]: Widen<T[K]> }
    : string;

export type Strings = Widen<typeof en>;

export const CORE_KEYS = {
  brand: 'catalogue.title',
  fullscreen: 'stage.expand',
  exploreMore: 'page.moreExplainers',
} as const satisfies Partial<Record<keyof Strings, string>>;

export type CoreKey = keyof typeof CORE_KEYS;

export type WidgetStrings = Omit<Strings, CoreKey>;

function lookup(source: unknown, path: string): string | undefined {
  const value = path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
      source,
    );
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export function resolveStrings(widget?: WidgetStrings, core?: object): Strings {
  const resolved = { ...en, ...widget } as Record<string, unknown>;
  for (const [key, path] of Object.entries(CORE_KEYS)) {
    resolved[key] = lookup(core, path) ?? en[key as CoreKey];
  }
  return resolved as Strings;
}

export const ENGLISH: Strings = en;
