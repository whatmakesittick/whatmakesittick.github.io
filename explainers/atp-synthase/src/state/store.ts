import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { EventId, RingId, TrainingId, ViewOptions } from '../ids';
import {
  BLADE_COUNTS,
  FULL_TURN_DEG,
  atpMade,
  lapCountAfter,
  protonsThrough,
  trainingLevel,
} from '../model';
import { ATP_TIMELINE, SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControl, Preset, PresetId } from './presets';
import { OXYGEN_RANGE } from './ranges';

export interface AtpSynthaseFields {
  ring: RingId;
  oxygen: number;
  event: EventId;
  training: TrainingId;
  laps: number;
  view: ViewState;
  preset: PresetId;
}

export interface AtpSynthaseOwnActions {
  setRing(ring: RingId): void;
  setOxygen(litresPerMinute: number): void;
  setEvent(event: EventId): void;
  setTraining(training: TrainingId): void;
}

export type AtpSynthaseState = PlaybackState & AtpSynthaseFields;
export type AtpSynthaseStoreState = Playback & AtpSynthaseFields & AtpSynthaseOwnActions;
export type AtpSynthaseStore = ExplainerStore<AtpSynthaseStoreState>;

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

type ChapterControls = Pick<AtpSynthaseFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = {
  membrane: true,
  cutaway: false,
  flow: true,
  labels: false,
};

export const DEFAULT_RING: RingId = 'animal';
export const DEFAULT_EVENT: EventId = 'm100';
export const DEFAULT_TRAINING: TrainingId = 'untrained';

const TRAINING_PRESET: PresetId = 'training';
export const SINGLE_MOTOR = 1;

const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  ring: DEFAULT_RING,
  oxygen: OXYGEN_RANGE.default,
  event: DEFAULT_EVENT,
  training: DEFAULT_TRAINING,
};

export function bladeCountOf(state: Pick<AtpSynthaseFields, 'ring'>): number {
  return BLADE_COUNTS[state.ring];
}

export function atpMadeOf(state: Pick<AtpSynthaseState, 'phase' | 'laps'>): number {
  return Math.max(0, atpMade(state.phase, state.laps));
}

export function protonsThroughOf(state: Pick<AtpSynthaseState, 'phase' | 'laps' | 'ring'>): number {
  return Math.max(0, protonsThrough(state.phase, state.laps, bladeCountOf(state)));
}

export function motorCountOf(state: Pick<AtpSynthaseFields, 'preset' | 'training'>): number {
  if (state.preset !== TRAINING_PRESET) return SINGLE_MOTOR;
  return trainingLevel(state.training).motors;
}

function chapterControls(preset: Preset, state: ChapterControls): ChapterControls {
  const keeps = (control: ChapterControl) => preset.controls?.includes(control) ?? false;
  return {
    ring: keeps('ring') ? state.ring : CHAPTER_CONTROL_DEFAULTS.ring,
    oxygen: keeps('oxygen') ? state.oxygen : CHAPTER_CONTROL_DEFAULTS.oxygen,
    event: keeps('event') ? state.event : CHAPTER_CONTROL_DEFAULTS.event,
    training: keeps('training') ? state.training : CHAPTER_CONTROL_DEFAULTS.training,
  };
}

function lapsTravelled(state: AtpSynthaseState, deltaSeconds: number): number {
  if (!state.playing) return 0;
  const travelledDeg = ATP_TIMELINE.rate(state.speed) * deltaSeconds;
  return Math.floor((state.phase + travelledDeg) / FULL_TURN_DEG);
}

function countLaps(store: AtpSynthaseStore): AtpSynthaseStore {
  const advance = store.getState().tick;
  let ticking = false;
  store.subscribe(
    (state) => state.phase,
    (phase, previous) => {
      if (ticking) return;
      const { laps } = store.getState();
      const next = lapCountAfter(previous, phase, laps);
      if (next !== laps) store.setState({ laps: next });
    },
  );
  store.setState({
    tick: (deltaSeconds) => {
      const before = store.getState();
      const wraps = lapsTravelled(before, deltaSeconds);
      ticking = true;
      advance(deltaSeconds);
      ticking = false;
      if (wraps !== 0) store.setState({ laps: before.laps + wraps });
    },
  });
  return store;
}

export function createAtpSynthaseStore(
  overrides: Partial<AtpSynthaseStoreState> = {},
): AtpSynthaseStore {
  const store = createExplainerStore<AtpSynthaseFields & AtpSynthaseOwnActions, Preset>(
    {
      timeline: ATP_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: SPEED_RANGE.default, view: DEFAULT_VIEW },
      extend: (set) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        laps: 0,
        setRing: (ring) => set({ ring }),
        setOxygen: (litresPerMinute) =>
          set({ oxygen: clamp(litresPerMinute, OXYGEN_RANGE.min, OXYGEN_RANGE.max) }),
        setEvent: (event) => set({ event }),
        setTraining: (training) => set({ training }),
      }),
      presetState: chapterControls,
    },
    overrides,
  );
  return countLaps(store);
}
