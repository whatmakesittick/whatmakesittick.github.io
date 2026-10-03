import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type {
  FlightModeId,
  MomentId,
  MoveId,
  PacketRate,
  PresetId,
  SpeedsterId,
  VideoId,
  ViewOptions,
} from '../ids';
import { MOMENTS, PAYLOAD_RANGE, SPEED_RANGE, TILT_RANGE } from '../model';
import { FPV_TIMELINE } from '../timeline';
import {
  DEFAULT_FLIGHT_MODE,
  DEFAULT_MOVE,
  DEFAULT_PACKET_RATE,
  DEFAULT_SPEEDSTER,
  DEFAULT_VIDEO,
  PRESETS,
} from './presets';
import type { ChapterControl, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface FpvFields {
  video: VideoId;
  move: MoveId;
  tilt: number;
  flightMode: FlightModeId;
  payload: number;
  packetRate: PacketRate;
  speedster: SpeedsterId;
  view: ViewState;
  preset: PresetId;
  throughGoggles: boolean;
}

export interface FpvOwnActions {
  setVideo(video: VideoId): void;
  setMove(move: MoveId): void;
  setTilt(degrees: number): void;
  setFlightMode(mode: FlightModeId): void;
  setPayload(grams: number): void;
  setPacketRate(rate: PacketRate): void;
  setSpeedster(speedster: SpeedsterId): void;
  seekMoment(moment: MomentId): void;
  setThroughGoggles(through: boolean): void;
}

export type FpvState = PlaybackState & FpvFields;
export type FpvStoreState = Playback & FpvFields & FpvOwnActions;
export type FpvStore = ExplainerStore<FpvStoreState>;

type ChapterControls = Pick<FpvFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = { links: true, track: true, arrows: false, labels: true };
const START_SPEED = PRESETS.overview.speed ?? SPEED_RANGE.default;

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  move: DEFAULT_MOVE,
  tilt: TILT_RANGE.default,
  flightMode: DEFAULT_FLIGHT_MODE,
  packetRate: DEFAULT_PACKET_RATE,
  payload: PAYLOAD_RANGE.default,
  speedster: DEFAULT_SPEEDSTER,
};

const CHAPTER_CONTROLS = Object.keys(CHAPTER_CONTROL_DEFAULTS) as ChapterControl[];

function kept<K extends ChapterControl>(
  preset: Preset,
  state: FpvFields,
  control: K,
): ChapterControls[K] {
  return preset.controls?.includes(control) ? state[control] : CHAPTER_CONTROL_DEFAULTS[control];
}

function chapterControls(preset: Preset, state: FpvFields): Partial<FpvFields> {
  return Object.fromEntries(
    CHAPTER_CONTROLS.map((control) => [control, kept(preset, state, control)]),
  ) as Partial<FpvFields>;
}

export function createFpvStore(overrides: Partial<FpvStoreState> = {}): FpvStore {
  return createExplainerStore<FpvFields & FpvOwnActions, Preset>(
    {
      timeline: FPV_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        video: DEFAULT_VIDEO,
        throughGoggles: false,
        setVideo: (video) => set({ video }),
        setMove: (move) => set({ move }),
        setTilt: (degrees) => set({ tilt: clamp(degrees, TILT_RANGE.min, TILT_RANGE.max) }),
        setFlightMode: (flightMode) => set({ flightMode }),
        setPayload: (grams) => set({ payload: clamp(grams, PAYLOAD_RANGE.min, PAYLOAD_RANGE.max) }),
        setPacketRate: (packetRate) => set({ packetRate }),
        setSpeedster: (speedster) => set({ speedster }),
        setThroughGoggles: (throughGoggles) => set({ throughGoggles }),
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
