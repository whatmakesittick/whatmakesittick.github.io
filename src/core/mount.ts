import './style.css';
import './scene/scene.css';
import type { Explainer, ExplainerStore, Playback } from './explainer';
import { initI18n, shippedLanguages } from './i18n';
import type { LocaleLoaders } from './i18n';
import { createSceneHost } from './scene/shell';
import { mountActions } from './ui/actions';
import { mountCatalogueLinks } from './ui/catalogueLink';
import { mountDock } from './ui/dock';
import { requireElement } from './ui/dom';
import { mountFooter } from './ui/footer';
import { mountKeyboard } from './ui/keyboard';
import { mountLanguage } from './ui/language';
import { respectReducedMotion } from './ui/motion';
import { mountReadouts } from './ui/readouts';
import { mountSafeArea } from './ui/safeArea';
import { mountSections } from './ui/sections';
import { mountStageExpansion, stageShortcuts } from './ui/stageExpansion';

const SITE_NAME_KEY = 'catalogue.title';
const SCENE_SELECTOR = '#scene';

function mountScene<S extends Playback>(
  root: Document,
  store: ExplainerStore<S>,
  explainer: Explainer<S>,
): () => void {
  const host = createSceneHost(
    requireElement(root, SCENE_SELECTOR),
    explainer.parts,
    explainer.scene,
  );
  const unmount = explainer.mountScene(host.shell, store);
  host.start(store);
  return () => {
    unmount();
    host.dispose();
  };
}

export async function mountExplainer<S extends Playback>(
  explainer: Explainer<S>,
  locales: LocaleLoaders,
): Promise<() => void> {
  await initI18n(locales);
  const languages = shippedLanguages(locales);
  const store = explainer.createStore();
  respectReducedMotion(store);
  mountDock(document, store, explainer);
  mountReadouts(document, store, explainer.readouts);
  mountLanguage(document, languages);
  mountCatalogueLinks(document);
  mountFooter(document, SITE_NAME_KEY);
  explainer.mountUi?.(document, store);
  mountActions(document, store, explainer.actions);
  const stage = mountStageExpansion(document);
  const unmountKeyboard = mountKeyboard(document, store, explainer, stageShortcuts(stage));
  mountSections(document, store, Object.keys(explainer.presets), stage);
  mountSafeArea(document);
  const unmountScene = mountScene(document, store, explainer);
  return () => {
    unmountScene();
    unmountKeyboard();
    stage.dispose();
  };
}
