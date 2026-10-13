import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import type { EngineStateId, PresetId, ViewOptions } from '../ids';
import {
  GUARD_TRIP_SECONDS,
  KICKBACK_SHOW_SECONDS,
  SPEED_RANGE,
  START_SHOW_SECONDS,
  THROTTLE_PRESETS,
  chainTravelMm,
  clutchOf,
  engineRpm,
  rate,
  rpmScale,
  shortestDelta,
  snapThrottle,
  startPose,
  wrapDegrees,
} from '../model';
import { CHAINSAW_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface ChainsawFields extends ChapterControls {
  chainMm: number;
  view: ViewState;
  preset: PresetId;
}

export interface ChainsawOwnActions {
  setThrottle(throttle: number): void;
  setBrake(on: boolean): void;
  startKickback(): void;
  startSaw(): void;
}

export type ChainsawState = PlaybackState & ChainsawFields;
export type ChainsawStoreState = Playback & ChainsawFields & ChainsawOwnActions;
export type ChainsawStore = ExplainerStore<ChainsawStoreState>;

type KickbackFields = Pick<ChainsawFields, 'kickback' | 'kickbackSeconds' | 'brake'>;

type StartFields = Pick<
  ChainsawFields,
  'starting' | 'startSeconds' | 'startPhase' | 'engine' | 'brake' | 'throttle'
>;

export interface StartStep {
  fields: StartFields;
  phase: number | null;
}

export const DEFAULT_VIEW: ViewState = { cutaway: false, flow: true, zone: false, labels: true };

const RUNNING: EngineStateId = 'running';
const STOPPED: EngineStateId = 'stopped';
const CRANK_FROM_POSE: ReadonlySet<EngineStateId> = new Set<EngineStateId>(['stopped', 'cranking']);

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  throttle: THROTTLE_PRESETS.full,
  brake: false,
  kickback: false,
  kickbackSeconds: 0,
  engine: RUNNING,
  starting: false,
  startSeconds: 0,
  startPhase: 0,
};

const START_PRESET: PresetId = 'saw';
const START_SPEED = PRESETS[START_PRESET].speed ?? SPEED_RANGE.default;
export const START_PHASE = PRESETS[START_PRESET].startAt ?? 0;
export const START_VIEW: ViewState = { ...DEFAULT_VIEW, ...PRESETS[START_PRESET].view };

function presetFields(preset: Preset, state: ChainsawFields): Partial<ChainsawFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

export function kickbackAfter(state: KickbackFields, deltaSeconds: number): KickbackFields {
  if (!state.kickback) return state;
  const seconds = state.kickbackSeconds + deltaSeconds;
  const trips = state.kickbackSeconds < GUARD_TRIP_SECONDS && seconds >= GUARD_TRIP_SECONDS;
  const brake = state.brake || trips;
  if (seconds >= KICKBACK_SHOW_SECONDS) return { kickback: false, kickbackSeconds: 0, brake };
  return { kickback: true, kickbackSeconds: seconds, brake };
}

export function startAfter(state: StartFields, deltaSeconds: number): StartStep {
  const seconds = state.startSeconds + deltaSeconds;
  if (seconds >= START_SHOW_SECONDS) {
    const fields = { ...state, starting: false, startSeconds: 0, engine: RUNNING };
    return { fields: { ...fields, throttle: THROTTLE_PRESETS.idle }, phase: null };
  }
  const pose = startPose(seconds);
  const fields: StartFields = {
    ...state,
    startSeconds: seconds,
    engine: pose.engine,
    brake: state.brake || pose.guardForward > 0,
  };
  const phase = CRANK_FROM_POSE.has(pose.engine)
    ? wrapDegrees(state.startPhase + pose.crankDeg)
    : null;
  return { fields, phase };
}

export function engineTurns(state: Pick<ChainsawState, 'engine'>): boolean {
  return !CRANK_FROM_POSE.has(state.engine);
}

function chainMoved(chainMm: number, crankDeg: number, state: ChainsawState): number {
  const rpm = engineRpm(state.engine, state.throttle);
  return chainMm + chainTravelMm(crankDeg, clutchOf(rpm, state.brake));
}

function driveChain(store: ChainsawStore): ChainsawStore {
  const { tick: advance, applyPreset: apply } = store.getState();
  let movedByTick = false;
  const quietly = (move: () => void) => {
    movedByTick = true;
    try {
      move();
    } finally {
      movedByTick = false;
    }
  };
  store.subscribe(
    (state) => state.phase,
    (phase, previous) => {
      if (movedByTick) return;
      const state = store.getState();
      const chainMm = chainMoved(state.chainMm, shortestDelta(previous, phase), state);
      if (chainMm !== state.chainMm) store.setState({ chainMm });
    },
  );
  const runEngine = (deltaSeconds: number) => {
    const before = store.getState();
    if (!before.playing || !engineTurns(before)) return;
    const scale = rpmScale(engineRpm(before.engine, before.throttle));
    const crankDeg = rate(before.speed) * deltaSeconds * scale;
    quietly(() => advance(deltaSeconds * scale));
    const chainMm = chainMoved(before.chainMm, crankDeg, before);
    if (chainMm !== before.chainMm) store.setState({ chainMm });
  };
  const runStart = (deltaSeconds: number) => {
    const before = store.getState();
    if (!before.starting) return;
    const { fields, phase } = startAfter(before, deltaSeconds);
    quietly(() => store.setState(phase === null ? fields : { ...fields, phase }));
  };
  store.setState({
    tick: (deltaSeconds) => {
      runStart(deltaSeconds);
      runEngine(deltaSeconds);
      const current = store.getState();
      const kickback = kickbackAfter(current, deltaSeconds);
      if (kickback !== current) store.setState(kickback);
    },
    applyPreset: (id) => quietly(() => apply(id)),
  });
  return store;
}

export function createChainsawStore(overrides: Partial<ChainsawStoreState> = {}): ChainsawStore {
  const store = createExplainerStore<ChainsawFields & ChainsawOwnActions, Preset>(
    {
      timeline: CHAINSAW_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: START_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        ...PRESETS[START_PRESET].start,
        chainMm: 0,
        setThrottle: (throttle) => {
          if (!get().starting) set({ throttle: snapThrottle(throttle) });
        },
        setBrake: (brake) => {
          if (!get().starting) set({ brake });
        },
        startKickback: () => set({ kickback: true, kickbackSeconds: 0, brake: false }),
        startSaw: () => {
          set({
            starting: true,
            startSeconds: 0,
            startPhase: get().phase,
            engine: STOPPED,
            brake: false,
            throttle: THROTTLE_PRESETS.idle,
            kickback: false,
            kickbackSeconds: 0,
          });
          get().play();
        },
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, ...overrides },
  );
  return driveChain(store);
}
