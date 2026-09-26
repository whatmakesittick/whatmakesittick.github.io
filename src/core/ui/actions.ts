import type { ChapterAction, ExplainerStore, Playback } from '../explainer';
import { queryAll, setPressed } from './dom';
import { watch } from './subscribe';

type ChapterActions<S extends Playback> = Readonly<Record<string, ChapterAction<S>>>;

function handleAction<S extends Playback>(
  event: Event,
  store: ExplainerStore<S>,
  actions: ChapterActions<S>,
): void {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest<HTMLElement>('[data-action]');
  const action = trigger ? actions[trigger.dataset.action ?? ''] : undefined;
  if (trigger && action) action.run(store.getState(), trigger.dataset.value ?? '');
}

function syncPressed<S extends Playback>(
  root: Document,
  store: ExplainerStore<S>,
  name: string,
  current: (state: S) => string,
): void {
  const triggers = queryAll(root, `[data-action="${name}"]`);
  watch(store, current, (value) =>
    triggers.forEach((trigger) => setPressed(trigger, trigger.dataset.value === value)),
  );
}

export function mountActions<S extends Playback>(
  root: Document,
  store: ExplainerStore<S>,
  actions: ChapterActions<S> = {},
): void {
  root.addEventListener('click', (event) => handleAction(event, store, actions));
  for (const [name, action] of Object.entries(actions)) {
    if (action.current) syncPressed(root, store, name, action.current);
  }
}
