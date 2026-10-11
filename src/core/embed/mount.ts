import type { Explainer, Playback } from '../explainer';
import { useEnglishOnly } from '../i18n/englishOnly';
import type { Dictionary } from '../i18n/resources';
import { createSceneHost } from '../scene/shell';
import type { FrameUpdate, SceneHost } from '../scene/shell';
import { respectReducedMotion } from '../ui/motion';
import { EMBED_DOM } from './contract';
import type { EmbedChapterOutline, EmbedController, EmbedMount, MountOptions } from './contract';
import { mountEmbedControls } from './controls';
import { createController, describeExplainer } from './controller';
import { loadLatinFonts } from './fonts';
import { attachStyles } from './styles';

export const FIRST_FRAME_TIMEOUT_MS = 8000;

export interface EmbedContent {
  slug: string;
  dictionary: Dictionary;
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

export async function mountEmbed<S extends Playback>(
  container: HTMLElement,
  explainer: Explainer<S>,
  options: EmbedOptions,
): Promise<EmbedController> {
  const { slug, dictionary, chapters, styles } = options;
  useEnglishOnly(dictionary);
  loadLatinFonts();
  const info = describeExplainer(slug, explainer, chapters);
  const detachStyles = attachStyles(slug, styles);
  container.setAttribute(EMBED_DOM.sceneAttr, slug);

  const store = explainer.createStore();
  if (options.chapter !== undefined && options.chapter in explainer.presets) {
    store.getState().applyPreset(options.chapter);
  }
  applyPlayback(store.getState(), options, () => respectReducedMotion(store));

  const controls = options.ui ? mountEmbedControls(options.ui, store, explainer) : undefined;
  const release = () => {
    controls?.dispose();
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

  const controller = createController(info, explainer, store, controls?.mounted, () => {
    unmountScene();
    host.dispose();
    release();
  });
  await ready;
  return controller;
}

export function defineEmbed<S extends Playback>(
  explainer: Explainer<S>,
  content: EmbedContent,
): EmbedMount {
  if (explainer.id !== content.slug) {
    throw new Error(`The embed ${content.slug} wraps the explainer ${explainer.id}`);
  }
  return (container, options = {}) => mountEmbed(container, explainer, { ...options, ...content });
}
