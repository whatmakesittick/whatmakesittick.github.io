import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { isLooping } from './explainer';
import { clamp } from './math';
import type {
  ExplainerStore,
  Playback,
  PlaybackActions,
  PlaybackState,
  Preset,
  Timeline,
  ViewFlags,
} from './explainer';

type SetState<S extends Playback> = ExplainerStore<S>['setState'];
type GetState<S extends Playback> = ExplainerStore<S>['getState'];

export type PlaybackDefaults<S extends PlaybackState> = Pick<S, 'preset' | 'speed' | 'view'>;
export type StoreExtension<E> = Omit<E, keyof PlaybackState | keyof PlaybackActions>;

export interface ExplainerStoreOptions<E extends object, P extends Preset> {
  timeline: Timeline;
  presets: Readonly<Record<string, P>>;
  defaults: PlaybackDefaults<Playback & E>;
  extend(set: SetState<Playback & E>, get: GetState<Playback & E>): StoreExtension<E>;
  presetState?(preset: P, state: Playback & E): Partial<E>;
}

export function wrapPhase(phase: number, cycle: number): number {
  return ((phase % cycle) + cycle) % cycle;
}

export function clampPhase(phase: number, cycle: number): number {
  return clamp(phase, 0, cycle);
}

function mergeView(view: ViewFlags, changes: Partial<ViewFlags> = {}): ViewFlags {
  const merged = { ...view };
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

function findPreset<P extends Preset>(presets: Readonly<Record<string, P>>, id: string): P {
  const preset = presets[id];
  if (!preset) throw new Error(`Unknown preset "${id}"`);
  return preset;
}

function playbackForPreset(
  state: PlaybackState,
  preset: Preset,
): Pick<PlaybackState, 'playing' | 'pausedByPreset'> {
  if (preset.pauseAt !== undefined) return { playing: false, pausedByPreset: true };
  if (state.pausedByPreset) return { playing: true, pausedByPreset: false };
  return { playing: state.playing, pausedByPreset: false };
}

export function createExplainerStore<E extends object, P extends Preset>(
  options: ExplainerStoreOptions<E, P>,
  overrides: Partial<Playback & E> = {},
): ExplainerStore<Playback & E> {
  const { timeline, presets, defaults } = options;
  const looping = isLooping(timeline);
  const place = (phase: number) =>
    looping ? wrapPhase(phase, timeline.cycle) : clampPhase(phase, timeline.cycle);
  const hasEnded = (phase: number) => !looping && phase >= timeline.cycle;
  const restartIfEnded = (phase: number) => (hasEnded(phase) ? 0 : phase);
  const clampSpeed = (speed: number) => clamp(speed, timeline.speed.min, timeline.speed.max);
  const phaseStart = (id: string) => {
    const phase = timeline.phases.find((candidate) => candidate.id === id);
    if (!phase) throw new Error(`Unknown phase "${id}"`);
    return phase.start;
  };

  return createStore<Playback & E>()(
    subscribeWithSelector((set, get) => {
      const patch = (partial: Partial<Playback>) => set(partial as Partial<Playback & E>);
      const play = () =>
        patch({ phase: restartIfEnded(get().phase), playing: true, pausedByPreset: false });
      const pause = () => patch({ playing: false, pausedByPreset: false });
      const playback: Playback = {
        phase: 0,
        playing: true,
        pausedByPreset: false,
        cameraResetToken: 0,
        ...defaults,

        tick: (deltaSeconds) => {
          const { playing, speed, phase } = get();
          if (!playing) return;
          const next = place(phase + timeline.rate(speed) * deltaSeconds);
          patch({ phase: next, playing: !hasEnded(next) });
        },
        setPhase: (phase) => patch({ phase: place(phase) }),
        step: (delta) => patch({ phase: place(get().phase + delta), playing: false }),
        jumpToPhase: (id) => patch({ phase: phaseStart(id), playing: false }),
        setSpeed: (speed) => patch({ speed: clampSpeed(speed) }),
        play,
        pause,
        togglePlaying: () => (get().playing ? pause() : play()),

        setView: (view) => patch({ view: mergeView(get().view, view) }),
        toggleView: (key) => patch({ view: { ...get().view, [key]: !get().view[key] } }),

        applyPreset: (id) => {
          const preset = findPreset(presets, id);
          const state = get();
          set({
            preset: id,
            ...options.presetState?.(preset, state),
            view: mergeView(state.view, preset.view),
            speed: preset.speed ?? state.speed,
            phase: place(preset.pauseAt ?? preset.startAt ?? state.phase),
            ...playbackForPreset(state, preset),
          } as Partial<Playback & E>);
        },
        resetCamera: () => patch({ cameraResetToken: get().cameraResetToken + 1 }),
      };
      return { ...playback, ...options.extend(set, get), ...overrides } as Playback & E;
    }),
  );
}
