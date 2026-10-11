import { isLooping } from '../explainer';
import type { Explainer, ExplainerStore, Playback } from '../explainer';
import { t } from '../i18n';
import { clamp } from '../math';
import type {
  EmbedChapterOutline,
  EmbedController,
  EmbedInfo,
  EmbedState,
  EmbedStateListener,
  EmbedUiMounted,
} from './contract';

const END_OF_LOOP = 1 - 1e-6;

export function describeExplainer<S extends Playback>(
  slug: string,
  explainer: Explainer<S>,
  chapters: readonly EmbedChapterOutline[],
): EmbedInfo {
  const { timeline, dock } = explainer;
  return {
    slug,
    title: t('meta.title'),
    eyebrow: t('meta.eyebrow'),
    tagline: t('meta.tagline'),
    chapters: chapters.map((chapter, index) => ({
      id: chapter.id,
      index: index + 1,
      title: t(`sections.${chapter.id}.title`),
      paragraphsHtml: chapter.paragraphs.map((key) => t(key)),
    })),
    phases: timeline.phases.map((phase) => ({
      id: phase.id,
      label: t(phase.labelKey),
      tone: phase.tone,
      start: phase.start,
      end: phase.end,
    })),
    cycle: timeline.cycle,
    loop: isLooping(timeline),
    speed: {
      min: timeline.speed.min,
      max: timeline.speed.max,
      step: timeline.speed.step,
      label: t(timeline.speed.labelKey),
    },
    toggles: dock.toggles.map((toggle) => ({
      id: toggle.view,
      label: t(toggle.nameKey),
      short: t(toggle.shortKey),
      hint: t(toggle.hintKey),
      icon: toggle.icon,
      shortcut: toggle.shortcut,
    })),
    choices: dock.choices.map((choice) => ({
      id: choice.id,
      label: t(choice.labelKey),
      ...(choice.shortcut === undefined ? {} : { shortcut: choice.shortcut }),
      options: choice.options.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    })),
  };
}

function phaseIndexAt(info: EmbedInfo, phase: number): number {
  const index = info.phases.findIndex((entry) => phase >= entry.start && phase < entry.end);
  if (index >= 0) return index;
  return phase >= (info.phases.at(-1)?.end ?? 0) ? info.phases.length - 1 : 0;
}

export function createController<S extends Playback>(
  info: EmbedInfo,
  explainer: Explainer<S>,
  store: ExplainerStore<S>,
  ui: EmbedUiMounted | undefined,
  unmount: () => void,
): EmbedController {
  const listeners = new Set<EmbedStateListener>();
  const choices = new Map(explainer.dock.choices.map((choice) => [choice.id, choice]));
  let disposed = false;
  let cached: { source: S; state: EmbedState } | undefined;

  const snapshot = (): EmbedState => {
    const source = store.getState();
    if (cached?.source === source) return cached.state;
    const phase = info.phases[phaseIndexAt(info, source.phase)];
    const selected: Record<string, string> = {};
    for (const choice of explainer.dock.choices) selected[choice.id] = choice.select(source);
    const state: EmbedState = {
      chapter: source.preset,
      playing: source.playing,
      phase: source.phase,
      progress: info.cycle > 0 ? clamp(source.phase / info.cycle, 0, 1) : 0,
      phaseId: phase?.id ?? '',
      phaseLabel: phase?.label ?? '',
      speed: source.speed,
      view: { ...source.view },
      choices: selected,
    };
    cached = { source, state };
    return state;
  };

  const unsubscribe = store.subscribe(() => {
    if (listeners.size === 0) return;
    const state = snapshot();
    listeners.forEach((listener) => listener(state));
  });

  const act = (run: (state: S) => void) => {
    if (!disposed) run(store.getState());
  };

  return {
    info,
    ...(ui ? { ui } : {}),
    getState: snapshot,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setChapter(id) {
      if (id in explainer.presets) act((state) => state.applyPreset(id));
    },
    play: () => act((state) => state.play()),
    pause: () => act((state) => state.pause()),
    togglePlaying: () => act((state) => state.togglePlaying()),
    seek(progress) {
      const share = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
      const phase = info.loop && share >= 1 ? info.cycle * END_OF_LOOP : share * info.cycle;
      act((state) => state.setPhase(phase));
    },
    setSpeed: (speed) => act((state) => state.setSpeed(speed)),
    setView: (id, on) => act((state) => state.setView({ [id]: on })),
    setChoice(id, value) {
      const choice = choices.get(id);
      if (!choice?.options.some((option) => option.value === value)) return;
      act((state) => choice.apply(state, value));
    },
    resetCamera: () => act((state) => state.resetCamera()),
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      listeners.clear();
      unmount();
    },
  };
}
