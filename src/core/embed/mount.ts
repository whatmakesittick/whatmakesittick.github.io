import type { Explainer, Playback } from '../explainer';
import { currentLanguage, onLanguageChanged } from '../i18n';
import { resolveLanguage, useLanguage } from '../i18n/embedded';
import type { LocaleLoaders } from '../i18n/resources';
import { createSceneHost } from '../scene/shell';
import type { FrameUpdate, SceneHost } from '../scene/shell';
import { respectReducedMotion } from '../ui/motion';
import { EMBED_DOM } from './contract';
import type { EmbedChapterOutline, EmbedController, EmbedMount, MountOptions } from './contract';
import { mountEmbedControls } from './controls';
import { createController, describeExplainer } from './controller';
import { loadFonts } from './fonts';
import { attachStyles } from './styles';

export const FIRST_FRAME_TIMEOUT_MS = 8000;

export interface EmbedContent {
  slug: string;
  locales: LocaleLoaders;
  chapters: readonly EmbedChapterOutline[];
  styles: string;
}

export type EmbedOptions = MountOptions & EmbedContent;

function firstFrame(onFrame: (update: FrameUpdate) => () => void): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      remove();
      clearTimeout(timer);
      resolve();
    };
    const remove = onFrame(() => {
      requestAnimationFrame(finish);
    });
    const timer = setTimeout(finish, FIRST_FRAME_TIMEOUT_MS);
  });
}

function applyPlayback(
  state: { pause(): void; play(): void },
  options: MountOptions,
  respect: () => void,
): void {
  if (options.reducedMotion === true) state.pause();
  else if (options.reducedMotion === undefined) respect();
  if (options.autoplay === false) state.pause();
  else if (options.autoplay === true && options.reducedMotion !== true) state.play();
}

const LANG_ATTR = 'lang';

function markLanguage(elements: readonly HTMLElement[]): () => void {
  const previous = elements.map((element) => element.getAttribute(LANG_ATTR));
  const mark = () => {
    const code = currentLanguage();
    elements.forEach((element) => element.setAttribute(LANG_ATTR, code));
  };
  mark();
  const unwatch = onLanguageChanged(mark);
  return () => {
    unwatch();
    elements.forEach((element, index) => {
      const value = previous[index];
      if (value === null || value === undefined) element.removeAttribute(LANG_ATTR);
      else element.setAttribute(LANG_ATTR, value);
    });
  };
}

async function applyLanguage(locales: LocaleLoaders, language: string | undefined): Promise<void> {
  const code = resolveLanguage(language);
  loadFonts(code);
  await useLanguage(locales, code);
}

export async function mountEmbed<S extends Playback>(
  container: HTMLElement,
  explainer: Explainer<S>,
  options: EmbedOptions,
): Promise<EmbedController> {
  const { slug, locales, chapters, styles } = options;
  await applyLanguage(locales, options.language);
  const describe = () => describeExplainer(slug, explainer, chapters);
  const info = describe();
  const detachStyles = attachStyles(slug, styles);
  container.setAttribute(EMBED_DOM.sceneAttr, slug);
  const slots = [options.ui?.dock, options.ui?.gauge].filter((slot) => slot !== undefined);
  const unmarkLanguage = markLanguage([container, ...slots]);

  const store = explainer.createStore();
  if (options.chapter !== undefined && options.chapter in explainer.presets) {
    store.getState().applyPreset(options.chapter);
  }
  applyPlayback(store.getState(), options, () => respectReducedMotion(store));

  const controls = options.ui ? mountEmbedControls(options.ui, store, explainer) : undefined;
  const release = () => {
    controls?.dispose();
    unmarkLanguage();
    detachStyles();
    if (container.getAttribute(EMBED_DOM.sceneAttr) === slug) {
      container.removeAttribute(EMBED_DOM.sceneAttr);
    }
  };

  let host: SceneHost;
  let unmountScene: () => void;
  try {
    host = createSceneHost(container, explainer.parts, explainer.scene);
  } catch (error) {
    release();
    throw error;
  }
  try {
    unmountScene = explainer.mountScene(host.shell, store);
  } catch (error) {
    host.dispose();
    release();
    throw error;
  }
  controls?.watchSafeArea(container, explainer.scene?.gaugeSide);
  const ready = firstFrame(host.shell.onFrame);
  host.start(store);

  const controller = createController(
    info,
    explainer,
    store,
    controls?.mounted,
    () => {
      unmountScene();
      host.dispose();
      release();
    },
    { apply: (language) => applyLanguage(locales, language), describe },
  );
  await ready;
  return controller;
}

export function defineEmbed<S extends Playback>(
  explainer: Explainer<S>,
  content: EmbedContent,
): EmbedMount {
  return (container, options = {}) => mountEmbed(container, explainer, { ...options, ...content });
}
