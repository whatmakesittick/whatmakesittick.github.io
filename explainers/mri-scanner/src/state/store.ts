import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type {
  FieldId,
  GradientAxisId,
  MomentId,
  PresetId,
  TissueId,
  ViewOptions,
  WeightingId,
} from '../ids';
import { LINE_DONE_UNITS, MODEL_SIZE, MOMENTS, SPEED_RANGE } from '../model';
import { MRI_SCANNER_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface MriScannerFields extends ChapterControls {
  field: FieldId;
  weighting: WeightingId;
  view: ViewState;
  preset: PresetId;
}

export interface MriScannerOwnActions {
  setField(field: FieldId): void;
  setWeighting(weighting: WeightingId): void;
  setLinesFilled(lines: number): void;
  addLine(): void;
  setTipAngle(degrees: number): void;
  setTissue(tissue: TissueId): void;
  setGradientAxis(axis: GradientAxisId | null): void;
  seekMoment(moment: MomentId): void;
}

export type MriScannerState = PlaybackState & MriScannerFields;
export type MriScannerStoreState = Playback & MriScannerFields & MriScannerOwnActions;
export type MriScannerStore = ExplainerStore<MriScannerStoreState>;

export interface SteppedRange {
  min: number;
  max: number;
  step: number;
}

export const TIP_ANGLE_RANGE = { min: 0, max: 180, step: 5, default: 90 } as const;
export const LINES_RANGE = { min: 0, max: MODEL_SIZE, step: 1, default: 0 } as const;

export const DEFAULT_VIEW: ViewState = {
  cutaway: false,
  fieldLines: false,
  voxel: false,
  labels: true,
};
export const DEFAULT_FIELD: FieldId = 'field15';
export const DEFAULT_WEIGHTING: WeightingId = 't2';

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  tipAngle: TIP_ANGLE_RANGE.default,
  tissue: 'whiteMatter',
  gradientAxis: null,
  linesFilled: LINES_RANGE.default,
};

const START_PRESET: PresetId = 'overview';
const START_SPEED = PRESETS[START_PRESET].speed ?? SPEED_RANGE.default;

export function snapToRange(value: number, { min, max, step }: SteppedRange): number {
  return clamp(min + Math.round((value - min) / step) * step, min, max);
}

export function crossesLineDone(previous: number, next: number): boolean {
  if (previous === next) return false;
  if (next > previous) return previous < LINE_DONE_UNITS && LINE_DONE_UNITS <= next;
  return previous < LINE_DONE_UNITS || LINE_DONE_UNITS <= next;
}

export function nextLineCount(lines: number): number {
  return lines >= LINES_RANGE.max ? LINES_RANGE.min : lines + 1;
}

export function freshScanLines(preset: PresetId): number {
  return PRESETS[preset].start?.linesFilled ?? LINES_RANGE.default;
}

function presetFields(preset: Preset, state: MriScannerFields): Partial<MriScannerFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

function countLinesOnPlayback(store: MriScannerStore): MriScannerStore {
  const advance = store.getState().tick;
  store.setState({
    tick: (deltaSeconds) => {
      const previous = store.getState().phase;
      advance(deltaSeconds);
      if (crossesLineDone(previous, store.getState().phase)) store.getState().addLine();
    },
  });
  return store;
}

export function createMriScannerStore(
  overrides: Partial<MriScannerStoreState> = {},
): MriScannerStore {
  const store = createExplainerStore<MriScannerFields & MriScannerOwnActions, Preset>(
    {
      timeline: MRI_SCANNER_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => {
        const newScan = () => ({ linesFilled: freshScanLines(get().preset) });
        return {
          ...CHAPTER_CONTROL_DEFAULTS,
          ...PRESETS[START_PRESET].start,
          field: DEFAULT_FIELD,
          weighting: DEFAULT_WEIGHTING,
          setField: (field) => {
            if (field !== get().field) set({ field, ...newScan() });
          },
          setWeighting: (weighting) => {
            if (weighting !== get().weighting) set({ weighting, ...newScan() });
          },
          setLinesFilled: (lines) => {
            get().pause();
            set({ linesFilled: snapToRange(lines, LINES_RANGE) });
          },
          addLine: () => set({ linesFilled: nextLineCount(get().linesFilled) }),
          setTipAngle: (degrees) => set({ tipAngle: snapToRange(degrees, TIP_ANGLE_RANGE) }),
          setTissue: (tissue) => set({ tissue }),
          setGradientAxis: (gradientAxis) => set({ gradientAxis }),
          seekMoment: (moment) => {
            get().pause();
            get().setPhase(MOMENTS[moment]);
          },
        };
      },
      presetState: presetFields,
    },
    overrides,
  );
  return countLinesOnPlayback(store);
}
