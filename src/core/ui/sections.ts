import type { ExplainerStore } from '../explainer';
import { queryAll, requireElement } from './dom';
import { parseOption } from './parse';
import type { StageExpansion } from './stageExpansion';
import { debounce } from './throttle';

const DESKTOP_QUERY = '(min-width: 900px)';
const ACTIVE_CLASS = 'is-active';
const RESIZE_SETTLE_MS = 150;
const READING_BAND_PX = 1;

interface Chapter {
  element: HTMLElement;
  preset: string;
}

type ExpandableStage = Pick<StageExpansion, 'expanded' | 'onChange'>;

function readingLineMargin(stage: HTMLElement, isDesktop: boolean): string {
  const viewportHeight = window.innerHeight;
  const covered = isDesktop ? 0 : stage.getBoundingClientRect().height;
  const line = covered + (viewportHeight - covered) / 2;
  const below = viewportHeight - line - READING_BAND_PX;
  return `${-Math.round(line)}px 0px ${-Math.round(below)}px 0px`;
}

function markActive(chapters: Chapter[], active: Chapter): void {
  chapters.forEach((chapter) => chapter.element.classList.toggle(ACTIVE_CLASS, chapter === active));
}

export function mountSections(
  root: Document,
  store: ExplainerStore,
  presetIds: readonly string[],
  expansion: ExpandableStage,
): void {
  const stage = requireElement(root, '[data-stage]');
  const chapters: Chapter[] = queryAll(root, '[data-preset]').map((element) => ({
    element,
    preset: parseOption(element.dataset.preset, presetIds),
  }));
  const desktop = window.matchMedia(DESKTOP_QUERY);
  let observer: IntersectionObserver | undefined;

  const activate = (chapter: Chapter) => {
    markActive(chapters, chapter);
    const state = store.getState();
    if (state.preset !== chapter.preset) state.applyPreset(chapter.preset);
  };

  const onIntersect = (entries: IntersectionObserverEntry[]) => {
    if (expansion.expanded) return;
    const crossing = entries.filter((entry) => entry.isIntersecting).at(-1);
    const chapter = chapters.find((candidate) => candidate.element === crossing?.target);
    if (chapter) activate(chapter);
  };

  const observe = () => {
    if (expansion.expanded) return;
    observer?.disconnect();
    observer = new IntersectionObserver(onIntersect, {
      rootMargin: readingLineMargin(stage, desktop.matches),
    });
    chapters.forEach((chapter) => observer?.observe(chapter.element));
  };

  const initial = chapters.find((chapter) => chapter.preset === store.getState().preset);
  if (initial) markActive(chapters, initial);
  observe();
  desktop.addEventListener('change', observe);
  window.addEventListener('resize', debounce(observe, RESIZE_SETTLE_MS));
  expansion.onChange((expanded) => {
    if (!expanded) observe();
  });
}
