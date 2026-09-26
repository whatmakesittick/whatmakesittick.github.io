import type { ExplainerStore } from '../explainer';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function respectReducedMotion(store: ExplainerStore): void {
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) store.getState().pause();
}
