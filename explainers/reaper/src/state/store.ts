import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { ComparisonId, LoadId, MomentId, PresetId, SensorModeId, ViewOptions } from '../ids';
import { AREA_DISTANCE_KM, MOMENTS, SPEED_RANGE, TARGET_RANGE_KM } from '../model';
import { REAPER_TIMELINE } from '../timeline';
import { DEFAULT_COMPARISON, DEFAULT_LOAD, DEFAULT_SENSOR_MODE, PRESETS } from './presets';
import type { ChapterControl, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface ReaperFields {
  load: LoadId;
  comparison: ComparisonId;
  sensorMode: SensorModeId;
  targetRange: number;
  areaDistance: number;
  view: ViewState;
  preset: PresetId;
}

export interface ReaperOwnActions {
  setLoad(load: LoadId): void;
  setComparison(comparison: ComparisonId): void;
  setSensorMode(sensorMode: SensorModeId): void;
  setTargetRange(km: number): void;
  setAreaDistance(km: number): void;
  seekMoment(moment: MomentId): void;
}

export type ReaperState = PlaybackState & ReaperFields;
export type ReaperStoreState = Playback & ReaperFields & ReaperOwnActions;
export type ReaperStore = ExplainerStore<ReaperStoreState>;

type ChapterControls = Pick<ReaperFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = { cutaway: false, links: true, track: true, labels: true };
const START_SPEED = PRESETS.overview.speed ?? SPEED_RANGE.default;

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  comparison: DEFAULT_COMPARISON,
  sensorMode: DEFAULT_SENSOR_MODE,
  targetRange: TARGET_RANGE_KM.default,
  areaDistance: AREA_DISTANCE_KM.default,
};

function kept<K extends ChapterControl>(
  preset: Preset,
  state: ReaperFields,
  control: K,
): ChapterControls[K] {
  return preset.controls?.includes(control) ? state[control] : CHAPTER_CONTROL_DEFAULTS[control];
}

function chapterControls(preset: Preset, state: ReaperFields): ChapterControls {
  return {
    comparison: kept(preset, state, 'comparison'),
    sensorMode: kept(preset, state, 'sensorMode'),
    targetRange: kept(preset, state, 'targetRange'),
    areaDistance: kept(preset, state, 'areaDistance'),
  };
}

export function createReaperStore(overrides: Partial<ReaperStoreState> = {}): ReaperStore {
  return createExplainerStore<ReaperFields & ReaperOwnActions, Preset>(
    {
      timeline: REAPER_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        load: DEFAULT_LOAD,
        setLoad: (load) => set({ load }),
        setComparison: (comparison) => set({ comparison }),
        setSensorMode: (sensorMode) => set({ sensorMode }),
        setTargetRange: (km) =>
          set({ targetRange: clamp(km, TARGET_RANGE_KM.min, TARGET_RANGE_KM.max) }),
        setAreaDistance: (km) =>
          set({ areaDistance: clamp(km, AREA_DISTANCE_KM.min, AREA_DISTANCE_KM.max) }),
        seekMoment: (moment) => {
          get().pause();
          get().setPhase(MOMENTS[moment]);
        },
      }),
      presetState: chapterControls,
    },
    overrides,
  );
}
