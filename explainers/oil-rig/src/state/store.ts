import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { BitId, MudState, ViewOptions } from '../ids';
import { DEFAULT_BIT, mudState, sectionAt } from '../model';
import { OIL_RIG_TIMELINE, SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControl, Preset, PresetId } from './presets';
import { DRAFT_RANGE, MUD_WEIGHT_RANGE, PRODUCTION_YEARS_RANGE, WATER_DEPTH_RANGE } from './ranges';

export interface OilRigFields {
  bit: BitId;
  mudWeight: number | null;
  draft: number;
  pickerDepth: number;
  productionYears: number;
  view: ViewState;
  preset: PresetId;
}

export interface OilRigOwnActions {
  setBit(bit: BitId): void;
  setMudWeight(mudWeight: number | null): void;
  setDraft(metres: number): void;
  setPickerDepth(metres: number): void;
  setProductionYears(years: number): void;
}

export type OilRigState = PlaybackState & OilRigFields;
export type OilRigStoreState = Playback & OilRigFields & OilRigOwnActions;
export type OilRigStore = ExplainerStore<OilRigStoreState>;

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

type MudInputs = Pick<OilRigState, 'phase' | 'mudWeight'>;
type ChapterControls = Pick<OilRigFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = { cutaway: true, mud: true, flow: false, labels: false };

const CHAPTER_CONTROL_DEFAULTS: ChapterControls = { mudWeight: null, draft: DRAFT_RANGE.default };

function within(value: number, range: { min: number; max: number }): number {
  return clamp(value, range.min, range.max);
}

export function plannedMudWeight(state: Pick<OilRigState, 'phase'>): number {
  return sectionAt(state.phase).plannedMudWeight;
}

export function effectiveMudWeight(state: MudInputs): number {
  return state.mudWeight ?? plannedMudWeight(state);
}

export function mudStateOf(state: MudInputs): MudState {
  return mudState(state.phase, effectiveMudWeight(state));
}

function chapterControls(preset: Preset, state: ChapterControls): ChapterControls {
  const keeps = (control: ChapterControl) => preset.controls?.includes(control) ?? false;
  return {
    mudWeight: keeps('mudWeight') ? state.mudWeight : CHAPTER_CONTROL_DEFAULTS.mudWeight,
    draft: keeps('draft') ? state.draft : CHAPTER_CONTROL_DEFAULTS.draft,
  };
}

export function createOilRigStore(overrides: Partial<OilRigStoreState> = {}): OilRigStore {
  return createExplainerStore<OilRigFields & OilRigOwnActions, Preset>(
    {
      timeline: OIL_RIG_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: SPEED_RANGE.default, view: DEFAULT_VIEW },
      extend: (set) => ({
        bit: DEFAULT_BIT,
        ...CHAPTER_CONTROL_DEFAULTS,
        pickerDepth: WATER_DEPTH_RANGE.default,
        productionYears: PRODUCTION_YEARS_RANGE.default,
        setBit: (bit) => set({ bit }),
        setMudWeight: (mudWeight) =>
          set({ mudWeight: mudWeight === null ? null : within(mudWeight, MUD_WEIGHT_RANGE) }),
        setDraft: (metres) => set({ draft: within(metres, DRAFT_RANGE) }),
        setPickerDepth: (metres) => set({ pickerDepth: within(metres, WATER_DEPTH_RANGE) }),
        setProductionYears: (years) =>
          set({ productionYears: within(years, PRODUCTION_YEARS_RANGE) }),
      }),
      presetState: chapterControls,
    },
    overrides,
  );
}
