import type { Explainer, ExplainerStore, Playback } from '../explainer';
import { nextOption } from './choices';
import { phaseShortcut } from './phases';

type KeyHandler<S extends Playback> = (state: S, event: KeyboardEvent) => void;
type KeyBindings<S extends Playback> = Record<string, KeyHandler<S>>;

export type ShellKeyHandler = () => boolean;
export type ShellKeys = Readonly<Record<string, ShellKeyHandler>>;

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const ACTIVATABLE_SELECTOR = 'button, a[href], summary, [role="button"]';
const ACTIVATION_KEYS = new Set([' ', 'Enter']);

function explainerBindings<S extends Playback>(explainer: Explainer<S>): KeyBindings<S> {
  const { timeline, dock, shortcuts = {} } = explainer;
  const bindings: KeyBindings<S> = {};
  const bind = (key: string | undefined, handler: KeyHandler<S>) => {
    if (key) bindings[key.toLowerCase()] = handler;
  };
  timeline.phases.forEach((phase, index) =>
    bind(phaseShortcut(index), (state) => state.jumpToPhase(phase.id)),
  );
  dock.toggles.forEach((toggle) => bind(toggle.shortcut, (state) => state.toggleView(toggle.view)));
  dock.choices.forEach((choice) =>
    bind(choice.shortcut, (state) => choice.apply(state, nextOption(choice, state))),
  );
  Object.entries(shortcuts).forEach(([key, handler]) => bind(key, handler));
  return bindings;
}

function keyBindings<S extends Playback>(explainer: Explainer<S>): KeyBindings<S> {
  const { nudge, speed } = explainer.timeline;
  const stepSize = (event: KeyboardEvent) => (event.shiftKey ? nudge.coarse : nudge.fine);
  return {
    ' ': (state) => state.togglePlaying(),
    arrowleft: (state, event) => state.step(-stepSize(event)),
    arrowright: (state, event) => state.step(stepSize(event)),
    arrowup: (state) => state.setSpeed(state.speed + speed.step),
    arrowdown: (state) => state.setSpeed(state.speed - speed.step),
    r: (state) => state.resetCamera(),
    ...explainerBindings(explainer),
  };
}

function hasBlockingModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

function isHandledByTarget(event: KeyboardEvent): boolean {
  if (!(event.target instanceof Element)) return false;
  if (event.target.closest(EDITABLE_SELECTOR)) return true;
  return ACTIVATION_KEYS.has(event.key) && event.target.closest(ACTIVATABLE_SELECTOR) !== null;
}

function shouldIgnore(event: KeyboardEvent): boolean {
  return event.defaultPrevented || hasBlockingModifier(event) || isHandledByTarget(event);
}

export function mountKeyboard<S extends Playback>(
  root: Document,
  store: ExplainerStore<S>,
  explainer: Explainer<S>,
  shellKeys: ShellKeys = {},
): () => void {
  const bindings = keyBindings(explainer);
  const handle = (event: KeyboardEvent): boolean => {
    const key = event.key.toLowerCase();
    if (shellKeys[key]?.()) return true;
    const handler = bindings[key];
    handler?.(store.getState(), event);
    return handler !== undefined;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!shouldIgnore(event) && handle(event)) event.preventDefault();
  };
  root.addEventListener('keydown', onKeyDown);
  return () => root.removeEventListener('keydown', onKeyDown);
}
