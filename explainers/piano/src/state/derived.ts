import type { ActionPose, AssemblyState, StrokeReading } from '../ids';
import { actionPoseAt, cycleMs, harpsichordPoseAt, strokeReadingAt, uprightPoseAt } from '../model';
import type { PianoState } from './store';

export type LiveSource = Pick<PianoState, 'phase' | 'touch' | 'pedal' | 'register'>;

export type AssemblySource = Pick<
  PianoState,
  'phase' | 'playing' | 'touch' | 'pedal' | 'register' | 'compare' | 'view'
>;

export interface LiveReading {
  realMs: number;
  cycleMs: number;
  stroke: StrokeReading;
  action: ActionPose;
}

export type LiveReader = (source: LiveSource) => LiveReading;

export function liveReading({ phase, touch, pedal, register }: LiveSource): LiveReading {
  const stroke = strokeReadingAt(phase, touch, pedal, register);
  return {
    realMs: stroke.realMs,
    cycleMs: cycleMs(touch, register),
    stroke,
    action: actionPoseAt(phase, touch, pedal, register),
  };
}

function sourceKey({ phase, touch, pedal, register }: LiveSource): string {
  return [phase, touch, pedal, register].join();
}

export function createLiveReader(): LiveReader {
  let last: { key: string; reading: LiveReading } | null = null;
  return (source) => {
    const key = sourceKey(source);
    if (last?.key !== key) last = { key, reading: liveReading(source) };
    return last.reading;
  };
}

function writeGhosts(target: AssemblyState, { phase, touch, pedal, register }: AssemblySource) {
  Object.assign(target.upright, uprightPoseAt(phase, touch, pedal, register));
  Object.assign(target.harpsichord, harpsichordPoseAt(phase, touch, register));
}

export function writeAssemblyState(
  source: AssemblySource,
  target: AssemblyState,
  read: LiveReader = liveReading,
): AssemblyState {
  const reading = read(source);
  target.phase = source.phase;
  target.playing = source.playing;
  target.touch = source.touch;
  target.pedal = source.pedal;
  target.register = source.register;
  target.compare = source.compare;
  Object.assign(target.stroke, reading.stroke);
  Object.assign(target.action, reading.action);
  writeGhosts(target, source);
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(
  source: AssemblySource,
  read: LiveReader = liveReading,
): AssemblyState {
  const empty = { stroke: {}, action: {}, upright: {}, harpsichord: {}, view: {} };
  return writeAssemblyState(source, empty as AssemblyState, read);
}
