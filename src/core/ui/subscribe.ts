import { shallow } from 'zustand/vanilla/shallow';
import type { ExplainerStore, Playback } from '../explainer';
import { onLanguageChanged } from '../i18n';

export type Selector<S, T> = (state: S) => T;

export function watch<S extends Playback, T>(
  store: ExplainerStore<S>,
  selector: Selector<S, T>,
  listener: (value: T) => void,
): () => void {
  return store.subscribe(selector, listener, { fireImmediately: true });
}

export function watchShallow<S extends Playback, T extends readonly unknown[]>(
  store: ExplainerStore<S>,
  selector: Selector<S, T>,
  listener: (value: T) => void,
): () => void {
  return store.subscribe(selector, listener, { equalityFn: shallow, fireImmediately: true });
}

function rerunOnLanguageChange<S extends Playback, T>(
  store: ExplainerStore<S>,
  selector: Selector<S, T>,
  listener: (value: T) => void,
  unsubscribe: () => void,
): () => void {
  const stopListening = onLanguageChanged(() => listener(selector(store.getState())));
  return () => {
    unsubscribe();
    stopListening();
  };
}

export function watchLocalized<S extends Playback, T>(
  store: ExplainerStore<S>,
  selector: Selector<S, T>,
  listener: (value: T) => void,
): () => void {
  return rerunOnLanguageChange(store, selector, listener, watch(store, selector, listener));
}

export function watchShallowLocalized<S extends Playback, T extends readonly unknown[]>(
  store: ExplainerStore<S>,
  selector: Selector<S, T>,
  listener: (value: T) => void,
): () => void {
  return rerunOnLanguageChange(store, selector, listener, watchShallow(store, selector, listener));
}
