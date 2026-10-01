import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import type { EngineId, PropellantId, ViewOptions } from '../ids';
import { phaseAtAltitude } from '../model';
import { RAPTOR_TIMELINE, SPEED_RANGE } from '../timeline';
import { DEFAULT_ENGINE, DEFAULT_PROPELLANT, PRESETS } from './presets';
import type { ChapterControl, Preset, PresetId } from './presets';

export interface RaptorFields {
  propellant: PropellantId;
  engine: EngineId;
  view: ViewState;
  preset: PresetId;
}

export interface RaptorOwnActions {
  setPropellant(propellant: PropellantId): void;
  setEngine(engine: EngineId): void;
  seekAltitude(km: number): void;
}

export type RaptorState = PlaybackState & RaptorFields;
export type RaptorStoreState = Playback & RaptorFields & RaptorOwnActions;
export type RaptorStore = ExplainerStore<RaptorStoreState>;

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

type ChapterControls = Pick<RaptorFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = {
  cutaway: false,
  flow: false,
  flame: true,
  cluster: false,
  labels: true,
};
const START_SPEED = PRESETS.overview.speed ?? SPEED_RANGE.default;

const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  propellant: DEFAULT_PROPELLANT,
  engine: DEFAULT_ENGINE,
};

function chapterControls(preset: Preset, state: RaptorFields): ChapterControls {
  const keeps = (control: ChapterControl) => preset.controls?.includes(control) ?? false;
  const defaults = CHAPTER_CONTROL_DEFAULTS;
  return {
    propellant: keeps('propellant') ? state.propellant : defaults.propellant,
    engine: keeps('engine') ? state.engine : defaults.engine,
  };
}

export function createRaptorStore(overrides: Partial<RaptorStoreState> = {}): RaptorStore {
  return createExplainerStore<RaptorFields & RaptorOwnActions, Preset>(
    {
      timeline: RAPTOR_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        setPropellant: (propellant) => set({ propellant }),
        setEngine: (engine) => set({ engine }),
        seekAltitude: (km) => {
          get().pause();
          get().setPhase(phaseAtAltitude(km));
        },
      }),
      presetState: chapterControls,
    },
    overrides,
  );
}
