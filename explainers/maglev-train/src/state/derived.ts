import type { AssemblyState, GhostReading, MotionReading, PowerReading, WaveReading } from '../ids';
import { PROFILES, ghostAt, motionAt, powerAt, tripSeconds, waveAt } from '../model';
import type { MaglevTrainState } from './store';

export type LiveSource = Pick<MaglevTrainState, 'phase' | 'topSpeed' | 'brakeMode'>;

export type AssemblySource = Pick<
  MaglevTrainState,
  'phase' | 'playing' | 'topSpeed' | 'brakeMode' | 'nudge' | 'nudgeToken' | 'compare' | 'view'
>;

export interface LiveReading {
  motion: MotionReading;
  wave: WaveReading;
  power: PowerReading;
  ghost: GhostReading;
  tripSeconds: number;
  topMs: number;
}

export type LiveReader = (source: LiveSource) => LiveReading;

export function liveReading({ phase, topSpeed, brakeMode }: LiveSource): LiveReading {
  const motion = motionAt(phase, topSpeed, brakeMode);
  return {
    motion,
    wave: waveAt(phase, topSpeed, brakeMode),
    power: powerAt(phase, topSpeed, brakeMode),
    ghost: ghostAt(motion.realSeconds, motion.distance),
    tripSeconds: tripSeconds(topSpeed),
    topMs: PROFILES[topSpeed].topMs,
  };
}

function sameSource(last: LiveSource, next: LiveSource): boolean {
  return (
    last.phase === next.phase &&
    last.topSpeed === next.topSpeed &&
    last.brakeMode === next.brakeMode
  );
}

export function createLiveReader(): LiveReader {
  let last: { source: LiveSource; reading: LiveReading } | null = null;
  return (source) => {
    if (!last || !sameSource(last.source, source)) {
      const { phase, topSpeed, brakeMode } = source;
      last = { source: { phase, topSpeed, brakeMode }, reading: liveReading(source) };
    }
    return last.reading;
  };
}

export function writeAssemblyState(
  target: AssemblyState,
  source: AssemblySource,
  read: LiveReader = liveReading,
): AssemblyState {
  const reading = read(source);
  target.phase = source.phase;
  target.playing = source.playing;
  target.topSpeed = source.topSpeed;
  target.brakeMode = source.brakeMode;
  Object.assign(target.motion, reading.motion);
  Object.assign(target.wave, reading.wave);
  Object.assign(target.power, reading.power);
  Object.assign(target.ghost, reading.ghost);
  target.nudge.id = source.nudge;
  target.nudge.token = source.nudgeToken;
  target.compare = source.compare;
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(
  source: AssemblySource,
  read: LiveReader = liveReading,
): AssemblyState {
  const reading = read(source);
  return {
    phase: source.phase,
    playing: source.playing,
    topSpeed: source.topSpeed,
    brakeMode: source.brakeMode,
    motion: { ...reading.motion },
    wave: { ...reading.wave },
    power: { ...reading.power },
    ghost: { ...reading.ghost },
    nudge: { id: source.nudge, token: source.nudgeToken },
    compare: source.compare,
    view: { ...source.view },
  };
}
