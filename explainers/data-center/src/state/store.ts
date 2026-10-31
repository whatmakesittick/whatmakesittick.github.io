import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import type { BenchmarkId, CoolingId, DistanceId, LoadId, PresetId, ViewOptions } from '../ids';
import { SPEED_RANGE } from '../model';
import { DATA_CENTER_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface DataCenterFields extends ChapterControls {
  cooling: CoolingId;
  load: LoadId;
  outageToken: number;
  view: ViewState;
  preset: PresetId;
}

export interface DataCenterOwnActions {
  setCooling(cooling: CoolingId): void;
  setLoad(load: LoadId): void;
  setBenchmark(benchmark: BenchmarkId): void;
  setDistance(distance: DistanceId): void;
  cutGrid(): void;
}

export type DataCenterState = PlaybackState & DataCenterFields;
export type DataCenterStoreState = Playback & DataCenterFields & DataCenterOwnActions;
export type DataCenterStore = ExplainerStore<DataCenterStoreState>;

export const DEFAULT_VIEW: ViewState = {
  power: true,
  heat: true,
  packets: false,
  labels: true,
  cutaway: false,
  follow: false,
  inset: true,
  lineUp: false,
};

export const CHAPTER_CONTROL_DEFAULTS: Readonly<ChapterControls> = {
  benchmark: 'average',
  distance: 'km1000',
};

const DEFAULT_COOLING: CoolingId = 'liquid';
const DEFAULT_LOAD: LoadId = 'full';

const START_PRESET: PresetId = 'building';
const START = PRESETS[START_PRESET];
const START_SPEED = START.speed ?? SPEED_RANGE.default;
const START_PAUSED = START.pauseAt !== undefined;
export const START_PHASE = START.pauseAt ?? START.startAt ?? 0;
export const START_VIEW: ViewState = { ...DEFAULT_VIEW, ...START.view };

function presetFields(preset: Preset, state: DataCenterFields): Partial<DataCenterFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

export function createDataCenterStore(
  overrides: Partial<DataCenterStoreState> = {},
): DataCenterStore {
  return createExplainerStore<DataCenterFields & DataCenterOwnActions, Preset>(
    {
      timeline: DATA_CENTER_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: START_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        ...START.start,
        cooling: DEFAULT_COOLING,
        load: DEFAULT_LOAD,
        outageToken: 0,
        setCooling: (cooling) => set({ cooling }),
        setLoad: (load) => set({ load }),
        setBenchmark: (benchmark) => set({ benchmark }),
        setDistance: (distance) => set({ distance }),
        cutGrid: () => set({ outageToken: get().outageToken + 1 }),
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, playing: !START_PAUSED, pausedByPreset: START_PAUSED, ...overrides },
  );
}
