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

const READINGS = ['motion', 'wave', 'power', 'ghost'] as const;

function sourceKey({ phase, topSpeed, brakeMode }: LiveSource): string {
  return [phase, topSpeed, brakeMode].join();
}

export function createLiveReader(): LiveReader {
  let last: { key: string; reading: LiveReading } | null = null;
  return (source) => {
    const key = sourceKey(source);
    if (last?.key !== key) last = { key, reading: liveReading(source) };
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
  READINGS.forEach((key) => Object.assign(target[key], reading[key]));
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
  const empty = { motion: {}, wave: {}, power: {}, ghost: {}, nudge: {}, view: {} };
  return writeAssemblyState(empty as AssemblyState, source, read);
}
