import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCatalogue } from '../../../vite/catalogue.ts';
import { toWidgetCatalogue } from '../../catalogue/build.ts';
import type { EmbedInfo, EmbedState } from '../../../src/core/embed/contract.ts';
import {
  allowsFullscreen,
  canonicalEntries,
  chapterShort,
  chapterViews,
  debounce,
  discreteOf,
  frameOf,
  mayShow,
  mergeTarget,
  modelContextText,
  neighbour,
  resolveChapter,
  resultFailed,
  sameDiscrete,
  scopeFromResult,
  scopeFromToolInfo,
  shownEntries,
  snapshotOf,
  stripOrder,
  targetFromInput,
  targetFromResult,
  wantedChapter,
} from '../../widget/src/state.ts';

const full = buildCatalogue(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'));
const catalogue = toWidgetCatalogue(full);
const mri = catalogue.explainers.find((e) => e.slug === 'mri-scanner')!;
const find = (slug: string) => catalogue.explainers.find((e) => e.slug === slug);

describe('resolveChapter', () => {
  it('takes ids, numbers and title words', () => {
    expect(resolveChapter(mri, 'magnet')).toBe('magnet');
    expect(resolveChapter(mri, 'MAGNET')).toBe('magnet');
    expect(resolveChapter(mri, '4')).toBe('resonance');
    expect(resolveChapter(mri, 4)).toBe('resonance');
    expect(resolveChapter(mri, 'radio pulse')).toBe('resonance');
  });
  it('returns undefined for nothing usable', () => {
    expect(resolveChapter(mri, undefined)).toBeUndefined();
    expect(resolveChapter(mri, '')).toBeUndefined();
    expect(resolveChapter(mri, '99')).toBeUndefined();
    expect(resolveChapter(mri, 'xyzzy')).toBeUndefined();
  });
});

describe('tool input / result', () => {
  it('reads the tool arguments', () => {
    expect(targetFromInput({ slug: 'mri-scanner', chapter: 'magnet' }, find)).toEqual({
      slug: 'mri-scanner',
      chapter: 'magnet',
    });
    expect(targetFromInput({ slug: 'mri-scanner', chapter: '2' }, find)).toEqual({
      slug: 'mri-scanner',
      chapter: 'magnet',
    });
    expect(targetFromInput({ slug: 'mri-scanner' }, find)).toEqual({ slug: 'mri-scanner' });
    expect(targetFromInput({ slug: 'toaster' }, find)).toBeUndefined();
    expect(targetFromInput(undefined, find)).toBeUndefined();
  });

  it('reads structuredContent only (ChatGPT)', () => {
    expect(
      targetFromResult({ structuredContent: { slug: 'engine', chapter: 'strokes' } }, find),
    ).toEqual({ slug: 'engine', chapter: 'strokes' });
  });

  it('reads content text only (Claude)', () => {
    const text =
      'Showing the interactive 3D explainer "How an MRI scanner works".\nOpened at chapter 2 of 6: "A magnet that never switches off" (id: magnet).\nWebsite: https://whatmakesittick.github.io/mri-scanner/';
    expect(targetFromResult({ content: [{ type: 'text', text }] }, find)).toEqual({
      slug: 'mri-scanner',
      chapter: 'magnet',
    });
  });

  it('ignores unknown slugs and garbage', () => {
    expect(targetFromResult({ structuredContent: { slug: 'toaster' } }, find)).toBeUndefined();
    expect(
      targetFromResult(
        { content: [{ type: 'text', text: 'https://whatmakesittick.github.io/toaster/' }] },
        find,
      ),
    ).toBeUndefined();
    expect(targetFromResult(null, find)).toBeUndefined();
    expect(targetFromResult({ content: 'x' }, find)).toBeUndefined();
  });
});

describe('renamed explainers', () => {
  const aliases: Record<string, string> = { motor: 'engine', 'old-heart': 'heart' };
  const resolve = (slug: string) => aliases[slug] ?? slug;
  const stale = [
    { slug: 'motor', tags: ['engines'] },
    { slug: 'glider', tags: ['flight'] },
  ];

  it('names each entry by its current slug and drops a stale twin', () => {
    expect(canonicalEntries(stale, resolve).map((e) => e.slug)).toEqual(['engine', 'glider']);
    const both = [{ slug: 'motor' }, { slug: 'engine' }, { slug: 'glider' }];
    expect(canonicalEntries(both, resolve).map((e) => e.slug)).toEqual(['engine', 'glider']);
    const same = [{ slug: 'glider' }];
    expect(canonicalEntries(same, resolve)[0]).toBe(same[0]);
  });

  it('opens the current slug when the tool input or result names a former one', () => {
    const entries = canonicalEntries(catalogue.explainers, resolve);
    const findRenamed = (slug: string) => entries.find((e) => e.slug === resolve(slug));
    expect(targetFromInput({ slug: 'old-heart', chapter: '2' }, findRenamed)).toEqual({
      slug: 'heart',
      chapter: catalogue.explainers.find((e) => e.slug === 'heart')!.chapters[1]!.id,
    });
    expect(targetFromResult({ structuredContent: { slug: 'old-heart' } }, findRenamed)).toEqual({
      slug: 'heart',
    });
    expect(
      targetFromResult(
        {
          content: [
            { type: 'text', text: 'Website: https://whatmakesittick.github.io/old-heart/' },
          ],
        },
        findRenamed,
      ),
    ).toEqual({ slug: 'heart' });
  });

  it('scopes a renamed explainer by its tags once the slug is resolved', () => {
    const entries = canonicalEntries(stale, resolve);
    const findRenamed = (slug: string) => entries.find((e) => e.slug === resolve(slug));
    expect(mayShow(findRenamed('motor'), { tags: ['engines'] }, false)).toBe(true);
    expect(mayShow(findRenamed('motor'), { tags: ['flight'] }, false)).toBe(false);
    expect(shownEntries(entries, { tags: ['engines'] })).toEqual([
      { slug: 'engine', tags: ['engines'] },
    ]);
  });
});

describe('allowed explainers', () => {
  it('reads the allowed tags from structuredContent, then from the text', () => {
    expect(
      scopeFromResult({ structuredContent: { slug: 'engine', allowedTags: ['physics'] } }),
    ).toEqual({ tags: ['physics'] });
    expect(
      scopeFromResult({
        content: [{ type: 'text', text: 'Showing.\nTags in the widget: physics, biology' }],
      }),
    ).toEqual({ tags: ['physics', 'biology'] });
    expect(
      scopeFromResult({ structuredContent: { allowedTags: ['physics', 7, 'Bad Tag'] } }),
    ).toEqual({ tags: ['physics'] });
    expect(scopeFromResult({ structuredContent: { allowedTags: [] } })).toEqual({ tags: [] });
    expect(scopeFromResult({ structuredContent: { slug: 'engine' } })).toBeUndefined();
    expect(scopeFromResult(null)).toBeUndefined();
  });

  it('reads the allowed tags of the tool the host reports', () => {
    const tool = {
      name: 'show_explainer',
      inputSchema: {
        type: 'object' as const,
        properties: { slug: { type: 'string', enum: ['engine', 'heart'] } },
      },
    };
    expect(scopeFromToolInfo({ toolInfo: { tool } })).toBeUndefined();
    expect(
      scopeFromToolInfo({
        toolInfo: { tool: { ...tool, _meta: { 'wmit/allowedTags': ['physics'] } } },
      }),
    ).toEqual({ tags: ['physics'] });
    expect(scopeFromToolInfo({})).toBeUndefined();
  });

  const engine = { slug: 'engine', tags: ['physics'] };
  const rifle = { slug: 'rifle', tags: ['physics', 'weapons'] };
  const fresh = { slug: 'fresh', tags: ['physics'] };
  const items = [engine, rifle, fresh];

  it('filters by the allowed tags, so an explainer newer than the call shows up', () => {
    expect(shownEntries(items, { tags: ['physics'] })).toEqual([engine, fresh]);
    expect(shownEntries(items, { tags: [] })).toEqual([]);
    expect(shownEntries([{ slug: 'plain', tags: [] }], { tags: [] })).toHaveLength(1);
  });

  it('shows only the open explainer without allowed tags', () => {
    expect(shownEntries(items, { tags: ['physics'] }, 'rifle')).toEqual([engine, fresh]);
    expect(shownEntries(items, undefined, 'rifle')).toEqual([rifle]);
    expect(shownEntries(items, undefined)).toEqual([]);
  });

  it('hides an explainer with a tag newer than the last call until the next call', () => {
    const garden = { slug: 'garden', tags: ['biology', 'gardening'] };
    const before = scopeFromResult({ structuredContent: { allowedTags: ['biology', 'physics'] } });
    expect(shownEntries([engine, garden], before)).toEqual([engine]);
    expect(mayShow(garden, before, false)).toBe(false);
    const after = scopeFromResult({
      structuredContent: { allowedTags: ['biology', 'gardening', 'physics'] },
    });
    expect(shownEntries([engine, garden], after)).toEqual([engine, garden]);
  });

  it('opens a target the server accepted, never one it refused or left out', () => {
    expect(mayShow(rifle, { tags: ['physics'] }, false)).toBe(false);
    expect(mayShow(fresh, { tags: ['physics'] }, false)).toBe(true);
    expect(mayShow(engine, { tags: ['physics'] }, true)).toBe(true);
    expect(mayShow(rifle, undefined, false)).toBe(true);
    expect(mayShow(rifle, undefined, true)).toBe(false);
    expect(mayShow(undefined, undefined, false)).toBe(false);
    expect(resultFailed({ isError: true })).toBe(true);
    expect(resultFailed({ content: [] })).toBe(false);
  });
});

describe('target', () => {
  it('keeps the previous target when the result names the same place', () => {
    const prev = { slug: 'engine', chapter: 'strokes' };
    expect(mergeTarget(prev, { slug: 'engine', chapter: 'strokes' })).toBe(prev);
  });

  it('takes the result over the previous target', () => {
    expect(mergeTarget(undefined, { slug: 'engine' })).toEqual({ slug: 'engine' });
    expect(mergeTarget({ slug: 'engine' }, { slug: 'engine', chapter: 'strokes' })).toEqual({
      slug: 'engine',
      chapter: 'strokes',
    });
  });

  it('drops the previous chapter when the result names another explainer', () => {
    expect(mergeTarget({ slug: 'engine', chapter: 'strokes' }, { slug: 'mri-scanner' })).toEqual({
      slug: 'mri-scanner',
    });
  });

  it('keeps the previous chapter when the result names the same explainer without one', () => {
    expect(mergeTarget({ slug: 'engine', chapter: 'strokes' }, { slug: 'engine' })).toEqual({
      slug: 'engine',
      chapter: 'strokes',
    });
  });

  it('opens the wanted chapter when the explainer has it, else the first', () => {
    const first = mri.chapters[0]!.id;
    expect(wantedChapter(mri, 'magnet')).toBe('magnet');
    expect(wantedChapter(mri, 'nope')).toBe(first);
    expect(wantedChapter(mri, undefined)).toBe(first);
    expect(wantedChapter({ ...mri, chapters: [] }, 'magnet')).toBe('');
  });
});

describe('discrete state', () => {
  const state: EmbedState = {
    chapter: 'magnet',
    playing: true,
    phase: 0,
    progress: 0,
    phaseId: 'echo',
    phaseLabel: 'Echo',
    speed: 1,
    view: { cutaway: true },
    choices: { field: '3' },
  };

  it('keeps only what the controls show', () => {
    expect(discreteOf(state)).toEqual({
      playing: true,
      view: { cutaway: true },
      choices: { field: '3' },
    });
  });

  it('compares by value', () => {
    const a = discreteOf(state);
    expect(
      sameDiscrete(a, { playing: true, view: { cutaway: true }, choices: { field: '3' } }),
    ).toBe(true);
    expect(sameDiscrete(a, { ...a, playing: false })).toBe(false);
    expect(sameDiscrete(a, { ...a, view: { cutaway: false } })).toBe(false);
    expect(sameDiscrete(a, { ...a, choices: {} })).toBe(false);
  });
});

describe('helpers', () => {
  it('neighbour', () => {
    const ids = ['a', 'b', 'c'];
    expect(neighbour(ids, 'b', 1)).toBe('c');
    expect(neighbour(ids, 'b', -1)).toBe('a');
    expect(neighbour(ids, 'c', 1)).toBeUndefined();
    expect(neighbour(ids, 'zz', 1)).toBe('a');
  });
  it('labels', () => {
    expect(chapterShort('magnet')).toBe('Magnet');
    expect(chapterShort('four-stroke')).toBe('Four stroke');
  });
  it('stripOrder puts the first explainer first', () => {
    expect(
      stripOrder([{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }], 'b').map((x) => x.slug),
    ).toEqual(['b', 'a', 'c']);
  });
});

describe('model context', () => {
  const info: EmbedInfo = {
    slug: 'mri-scanner',
    language: 'en',
    title: mri.title,
    eyebrow: mri.eyebrow,
    tagline: '',
    chapters: mri.chapters.map((c, i) => ({
      id: c.id,
      index: i + 1,
      title: c.title,
      paragraphsHtml: [`Text of <strong>${c.id}</strong>.`],
    })),
    phases: [{ id: 'echo', label: 'Echo', tone: '#4fd1c5', start: 0, end: 1 }],
    cycle: 1,
    loop: true,
    speed: { min: 0.25, max: 2, step: 0.25, label: 'Speed' },
    toggles: [
      { id: 'cutaway', label: 'Cutaway', short: 'Cutaway', hint: '', icon: '', shortcut: 'C' },
    ],
    choices: [{ id: 'field', label: 'Field strength', options: [{ value: '3', label: '3 T' }] }],
  };
  const state: EmbedState = {
    chapter: 'resonance',
    playing: false,
    phase: 0.5,
    progress: 0.5,
    phaseId: 'echo',
    phaseLabel: 'Echo',
    speed: 1,
    view: { cutaway: true },
    choices: { field: '3' },
  };

  it('is a full snapshot with the chapter text', () => {
    const snap = snapshotOf('mri-scanner', state, 'magnet');
    expect(snap).toEqual({
      slug: 'mri-scanner',
      chapter: 'resonance',
      view: { cutaway: true },
      choices: { field: '3' },
      playing: false,
    });
    const text = modelContextText(mri, info, snap, state);
    expect(text).toContain('chapter 4/6 "A radio pulse and its echo" (id resonance)');
    expect(text).toContain('Views: cutaway on.');
    expect(text).toContain('Choice field strength: 3 T.');
    expect(text).toContain('Playback: paused at "Echo".');
    expect(text).toContain('Chapter text: Text of resonance.');
    expect(text).not.toContain('<');
  });

  it('names the language and uses localized titles', () => {
    const uk = toWidgetCatalogue(full, 'uk').explainers.find((e) => e.slug === 'mri-scanner')!;
    const localized: EmbedInfo = {
      ...info,
      language: 'uk',
      chapters: info.chapters.map((c) => ({
        ...c,
        title: uk.chapters.find((u) => u.id === c.id)!.title,
      })),
    };
    const snap = snapshotOf('mri-scanner', state, 'magnet');
    const text = modelContextText(uk, localized, snap, state, 'uk');
    expect(uk.title).not.toBe(mri.title);
    expect(text).toContain(`"${uk.title}"`);
    expect(text).toContain(`"${uk.chapters[3]!.title}" (id resonance)`);
    expect(text).toContain('Language: uk.');
    expect(text).toContain('Chapter text: Text of resonance.');
  });

  it('skips scene text in another language than the one shown', () => {
    const uk = toWidgetCatalogue(full, 'uk').explainers.find((e) => e.slug === 'mri-scanner')!;
    const snap = snapshotOf('mri-scanner', state, 'magnet');
    const text = modelContextText(uk, info, snap, state, 'uk');
    expect(text).toContain(`"${uk.chapters[3]!.title}" (id resonance)`);
    expect(text).not.toContain('Chapter text');
    expect(text).not.toContain('A radio pulse and its echo');
  });

  it('works before the scene is mounted', () => {
    const text = modelContextText(
      mri,
      undefined,
      snapshotOf('mri-scanner', undefined, 'magnet'),
      undefined,
    );
    expect(text).toContain('chapter 2/6');
    expect(text).not.toContain('Chapter text');
  });
});

describe('chapter views', () => {
  const known: EmbedInfo = {
    slug: 'mri-scanner',
    language: 'de',
    title: mri.title,
    eyebrow: mri.eyebrow,
    tagline: '',
    chapters: [{ id: 'magnet', index: 2, title: 'Der Magnet', paragraphsHtml: ['Text.'] }],
    phases: [],
    cycle: 1,
    loop: true,
    speed: { min: 1, max: 1, step: 1, label: 'Speed' },
    toggles: [],
    choices: [],
  };

  it('numbers the catalogue chapters and gives short english labels', () => {
    const views = chapterViews(mri, undefined, undefined, 'en');
    expect(views).toHaveLength(mri.chapters.length);
    expect(views[1]).toEqual({
      id: 'magnet',
      index: 2,
      title: mri.chapters[1]!.title,
      short: 'Magnet',
      paragraphsHtml: [],
    });
  });

  it('takes the text from the scene and the titles only from a scene in the same language', () => {
    expect(chapterViews(mri, known, known, 'de')[1]).toEqual({
      id: 'magnet',
      index: 2,
      title: 'Der Magnet',
      short: 'Der Magnet',
      paragraphsHtml: ['Text.'],
    });
    expect(chapterViews(mri, known, undefined, 'fr')[1]).toEqual({
      id: 'magnet',
      index: 2,
      title: mri.chapters[1]!.title,
      short: mri.chapters[1]!.title,
      paragraphsHtml: ['Text.'],
    });
  });
});

describe('frame', () => {
  it('sets the safe area and the host radius', () => {
    expect(
      frameOf(
        {
          safeAreaInsets: { top: 1, right: 2, bottom: 3, left: 4 },
          styles: { variables: { '--border-radius-xl': '12px' } },
        } as Parameters<typeof frameOf>[0],
        () => false,
      ).style,
    ).toEqual({
      '--safe-top': '1px',
      '--safe-right': '2px',
      '--safe-bottom': '3px',
      '--safe-left': '4px',
      '--border-radius-xl': '12px',
    });
    expect(frameOf({}, () => false).style).toEqual({
      '--safe-top': '0px',
      '--safe-right': '0px',
      '--safe-bottom': '0px',
      '--safe-left': '0px',
    });
  });

  it('asks the pointer only when the host does not say whether it is touch', () => {
    const coarse = vi.fn(() => true);
    expect(frameOf({ deviceCapabilities: { touch: false } }, coarse).touch).toBe(false);
    expect(coarse).not.toHaveBeenCalled();
    expect(frameOf({}, coarse).touch).toBe(true);
  });

  it('allows fullscreen unless the host leaves it out', () => {
    expect(allowsFullscreen({})).toBe(true);
    expect(allowsFullscreen({ availableDisplayModes: ['inline', 'fullscreen'] })).toBe(true);
    expect(allowsFullscreen({ availableDisplayModes: ['inline'] })).toBe(false);
  });
});

describe('debounce', () => {
  afterEach(() => vi.useRealTimers());
  it('keeps only the last call', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 600);
    d(1);
    d(2);
    vi.advanceTimersByTime(599);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledExactlyOnceWith(2);
  });
});
