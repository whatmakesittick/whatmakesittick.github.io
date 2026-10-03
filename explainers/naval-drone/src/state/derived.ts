import type {
  BoatReading,
  CompanionReading,
  HelmId,
  JetReading,
  LinkReading,
  PlaningReading,
  SeaReading,
} from '../ids';
import {
  boatAt,
  companionsAt,
  distanceToShip,
  helmNozzle,
  jetAt,
  lagMetres,
  planingAt,
  poseAtDistance,
  seaAt,
  speedAt,
  steerAt,
  throttleAt,
} from '../model';
import type { NavalDroneState } from './store';

const RUN_SOURCE_KEYS = [
  'phase',
  'trialKnots',
  'helm',
  'linkMode',
  'videoDelayMs',
  'seaState',
  'preset',
] as const;

export type RunSource = Pick<NavalDroneState, (typeof RUN_SOURCE_KEYS)[number]>;
export type FlagSource = Pick<NavalDroneState, 'view' | 'preset'>;

export interface RunReading {
  boat: BoatReading;
  planing: PlaningReading;
  jet: JetReading;
  companions: readonly CompanionReading[];
  distanceToShip: number;
  sea: SeaReading;
  link: LinkReading;
}

export interface AssemblyFlags {
  waterSection: boolean;
  wettedBar: boolean;
}

type Motion = Pick<RunReading, 'boat' | 'planing' | 'jet' | 'companions'>;

const NO_COMPANIONS: readonly CompanionReading[] = [];
const STOPPED_KNOTS = 0;

function runningAt(phase: number): Motion {
  const boat = boatAt(phase);
  return {
    boat,
    planing: planingAt(boat.knots),
    jet: jetAt(throttleAt(boat.knots), boat.knots, steerAt(phase), false),
    companions: companionsAt(phase),
  };
}

function heldAt(phase: number, trialKnots: number, helm: HelmId): Motion {
  const reverse = helm === 'reverse';
  const knots = reverse ? STOPPED_KNOTS : trialKnots;
  return {
    boat: { ...boatAt(phase), knots, held: true },
    planing: planingAt(knots),
    jet: jetAt(throttleAt(trialKnots), knots, helmNozzle(helm), reverse),
    companions: NO_COMPANIONS,
  };
}

function linkOf(source: RunSource, boat: BoatReading): LinkReading {
  const { linkMode: mode, videoDelayMs, preset } = source;
  if (preset !== 'link' || mode === 'lost') return { mode, ghost: null };
  return { mode, ghost: poseAtDistance(boat.distance - lagMetres(videoDelayMs, boat.knots)) };
}

function readingOf(source: RunSource): RunReading {
  const { phase, trialKnots, helm, seaState } = source;
  const motion = trialKnots === null ? runningAt(phase) : heldAt(phase, trialKnots, helm);
  return {
    ...motion,
    distanceToShip: distanceToShip(phase),
    sea: seaAt(seaState),
    link: linkOf(source, motion.boat),
  };
}

interface Remembered {
  source: RunSource;
  reading: RunReading;
}

let last: Remembered | null = null;

function sourceOf(state: RunSource): RunSource {
  const { phase, trialKnots, helm, linkMode, videoDelayMs, seaState, preset } = state;
  return { phase, trialKnots, helm, linkMode, videoDelayMs, seaState, preset };
}

function isRemembered(source: RunSource): boolean {
  return last !== null && RUN_SOURCE_KEYS.every((key) => last?.source[key] === source[key]);
}

export function runAt(state: RunSource): Readonly<RunReading> {
  if (!last || !isRemembered(state)) {
    const source = sourceOf(state);
    last = { source, reading: readingOf(source) };
  }
  return last.reading;
}

export function followedKnots(state: Pick<NavalDroneState, 'trialKnots' | 'phase'>): number {
  return state.trialKnots ?? speedAt(state.phase);
}

export function assemblyFlags({ view, preset }: FlagSource): AssemblyFlags {
  return { waterSection: view.cutaway || preset === 'hull', wettedBar: preset === 'hull' };
}
