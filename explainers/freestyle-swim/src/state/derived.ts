import { formatFixed } from '@core/format';
import type { ViewOptions } from '../ids';
import type { AssemblyState, BreathId, KickId, PaceId, StrokeReading } from '../ids';
import { PACES, armGap, strokeAt } from '../model';

const PERCENT_DIGITS = 1;
const SECONDS_DIGITS = 2;

export interface KickSource {
  pace: PaceId;
  kickOverride: KickId | null;
}

export interface ReadingSource extends KickSource {
  phase: number;
  breathing: BreathId;
  headUp: boolean;
}

export interface AssemblySource extends ReadingSource {
  playing: boolean;
  view: ViewOptions;
}

export interface TextWithParams {
  key: string;
  params: Record<string, string>;
}

export function effectiveKick(source: KickSource): KickId {
  return source.kickOverride ?? PACES[source.pace].defaultKick;
}

let lastSource: ReadingSource | null = null;
let lastReading: StrokeReading | null = null;

function sameSource(a: ReadingSource, b: ReadingSource): boolean {
  return (
    a.phase === b.phase &&
    a.pace === b.pace &&
    a.kickOverride === b.kickOverride &&
    a.breathing === b.breathing &&
    a.headUp === b.headUp
  );
}

function readingFor(phase: number, source: ReadingSource): StrokeReading {
  const next = { ...source, phase };
  if (lastReading && lastSource && sameSource(lastSource, next)) return lastReading;
  lastSource = next;
  lastReading = strokeAt(phase, {
    pace: source.pace,
    kick: effectiveKick(source),
    breathing: source.breathing,
    headUp: source.headUp,
  });
  return lastReading;
}

export function strokeReading(source: ReadingSource): StrokeReading {
  return readingFor(source.phase, source);
}

export function toAssemblyState(
  source: AssemblySource,
  phase: number,
  playing: boolean,
  target: AssemblyState,
): AssemblyState {
  const reading = readingFor(phase, source);
  target.phase = phase;
  target.playing = playing;
  target.reading = reading;
  target.pace = source.pace;
  target.kick = reading.kick;
  target.breathing = source.breathing;
  target.headUp = source.headUp;
  target.dragFactor = reading.dragFactor;
  target.entrySplash = reading.entrySplash;
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const reading = readingFor(source.phase, source);
  return toAssemblyState(source, source.phase, source.playing, {
    phase: source.phase,
    playing: source.playing,
    reading,
    pace: source.pace,
    kick: reading.kick,
    breathing: source.breathing,
    headUp: source.headUp,
    dragFactor: reading.dragFactor,
    entrySplash: reading.entrySplash,
    view: { ...source.view },
  });
}

export function armGapText(pace: PaceId): TextWithParams {
  const { idcPercent, seconds, kind } = armGap(pace);
  return {
    key: kind === 'gap' ? 'chapters.drag.gapValue' : 'chapters.drag.overlapValue',
    params: {
      percent: formatFixed(Math.abs(idcPercent), PERCENT_DIGITS),
      seconds: formatFixed(seconds, SECONDS_DIGITS),
    },
  };
}
