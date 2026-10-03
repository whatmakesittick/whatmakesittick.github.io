import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import { shallow } from 'zustand/vanilla/shallow';
import type {
  FitId,
  HelmId,
  LinkMode,
  MomentId,
  PresetId,
  SeaStateId,
  SpeedMarkId,
  ViewOptions,
} from '../ids';
import {
  DEFAULT_SEA_STATE,
  MOMENTS,
  RADAR_HEIGHT_M,
  SPEED_MARKS,
  SPEED_RANGE,
  VIDEO_DELAY_MS,
  knotsAtThrottle,
  speedAt,
  stepTo,
  throttleShareOf,
  trialKnotsOf,
} from '../model';
import { NAVAL_DRONE_TIMELINE } from '../timeline';
import { DEFAULT_FIT, PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface NavalDroneFields extends ChapterControls {
  fit: FitId;
  view: ViewState;
  preset: PresetId;
}

export interface NavalDroneOwnActions {
  setFit(fit: FitId): void;
  setTrialKnots(knots: number): void;
  setThrottle(percent: number): void;
  setSpeedMark(mark: SpeedMarkId): void;
  setHelm(helm: HelmId): void;
  releaseTrial(): void;
  setLinkMode(mode: LinkMode): void;
  setVideoDelay(delayMs: number): void;
  setRadarHeight(metres: number): void;
  setSeaState(sea: SeaStateId): void;
  seekMoment(moment: MomentId): void;
}

export type NavalDroneState = PlaybackState & NavalDroneFields;
export type NavalDroneStoreState = Playback & NavalDroneFields & NavalDroneOwnActions;
export type NavalDroneStore = ExplainerStore<NavalDroneStoreState>;

export const DEFAULT_VIEW: ViewState = { cutaway: true, flow: false, links: false, labels: true };
export const DEFAULT_HELM: HelmId = 'straight';
const START_SPEED = PRESETS.overview.speed ?? SPEED_RANGE.default;

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  trialKnots: null,
  helm: DEFAULT_HELM,
  linkMode: 'satellite',
  videoDelayMs: VIDEO_DELAY_MS.default,
  radarHeight: RADAR_HEIGHT_M.default,
  seaState: DEFAULT_SEA_STATE,
};

function presetFields(preset: Preset, state: NavalDroneFields): Partial<NavalDroneFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

type TrialWatch = readonly [phase: number, playing: boolean, preset: PresetId];

function shouldRelease(next: TrialWatch, previous: TrialWatch): boolean {
  const [phase, playing, preset] = next;
  const [lastPhase, wasPlaying, lastPreset] = previous;
  return (playing && !wasPlaying) || (phase !== lastPhase && preset === lastPreset);
}

function releaseTrialOnRun(store: NavalDroneStore): NavalDroneStore {
  store.subscribe(
    (state): TrialWatch => [state.phase, state.playing, state.preset],
    (next, previous) => {
      if (shouldRelease(next, previous)) store.getState().releaseTrial();
    },
    { equalityFn: shallow },
  );
  return store;
}

export function createNavalDroneStore(
  overrides: Partial<NavalDroneStoreState> = {},
): NavalDroneStore {
  const store = createExplainerStore<NavalDroneFields & NavalDroneOwnActions, Preset>(
    {
      timeline: NAVAL_DRONE_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => {
        const hold = (fields: Pick<ChapterControls, 'trialKnots'> & Partial<ChapterControls>) => {
          if (get().playing) get().pause();
          set(fields);
        };
        return {
          ...CHAPTER_CONTROL_DEFAULTS,
          fit: DEFAULT_FIT,
          setFit: (fit) => set({ fit }),
          setTrialKnots: (knots) => hold({ trialKnots: trialKnotsOf(knots) }),
          setThrottle: (percent) => hold({ trialKnots: knotsAtThrottle(throttleShareOf(percent)) }),
          setSpeedMark: (mark) => hold({ trialKnots: SPEED_MARKS[mark] }),
          setHelm: (helm) => {
            const { trialKnots, phase } = get();
            hold({ trialKnots: trialKnots ?? trialKnotsOf(speedAt(phase)), helm });
          },
          releaseTrial: () => {
            const { trialKnots, helm } = get();
            if (trialKnots === null && helm === DEFAULT_HELM) return;
            set({ trialKnots: null, helm: DEFAULT_HELM });
          },
          setLinkMode: (linkMode) => set({ linkMode }),
          setVideoDelay: (delayMs) => set({ videoDelayMs: stepTo(delayMs, VIDEO_DELAY_MS) }),
          setRadarHeight: (metres) => set({ radarHeight: stepTo(metres, RADAR_HEIGHT_M) }),
          setSeaState: (seaState) => set({ seaState }),
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
  return releaseTrialOnRun(store);
}
