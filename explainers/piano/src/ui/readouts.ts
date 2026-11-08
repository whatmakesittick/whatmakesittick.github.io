import type { Readout } from '@core/explainer';
import type { ReadoutText } from '@core/ui/liveReadouts';
import { clamp } from '@core/math';
import { BLOW_MM, HAMMER_SPEED_MS, KEY_DIP_MM, LEVEL_RANGE_DB } from '../model';
import { createLiveReader } from '../state';
import type { LiveReading, PianoStoreState } from '../state';
import { THEME } from '../theme';
import {
  formatHammerGap,
  formatHammerSpeed,
  formatLevel,
  formatMm,
  formatRealTime,
} from './format';

export type ChapterReadouts = Readonly<Record<string, ReadoutText<PianoStoreState>>>;

const SILENT_SHARE = 0;

const read = createLiveReader();

function readout(
  id: string,
  value: (reading: LiveReading) => string,
  share: (reading: LiveReading) => number,
  fill: string,
): Readout<PianoStoreState> {
  return {
    id,
    labelKey: `readouts.${id}`,
    numeric: true,
    value: (state) => value(read(state)),
    meter: { share: (state) => clamp(share(read(state)), 0, 1), fill },
  };
}

function levelShare(levelDb: number | null): number {
  return levelDb === null ? SILENT_SHARE : 1 + levelDb / LEVEL_RANGE_DB;
}

export const PIANO_READOUTS: readonly Readout<PianoStoreState>[] = [
  readout(
    'time',
    ({ realMs }) => formatRealTime(realMs),
    ({ realMs, cycleMs }) => realMs / cycleMs,
    THEME.release,
  ),
  readout(
    'key',
    ({ action }) => formatMm(action.keyMm),
    ({ action }) => action.keyMm / KEY_DIP_MM,
    THEME.press,
  ),
  readout(
    'hammer',
    ({ action }) => formatHammerGap(action),
    ({ action }) => action.hammerRiseMm / BLOW_MM,
    THEME.escape,
  ),
  readout(
    'speed',
    ({ action }) => formatHammerSpeed(action.hammerSpeedMs),
    ({ action }) => Math.abs(action.hammerSpeedMs) / HAMMER_SPEED_MS.hard,
    THEME.strike,
  ),
  readout(
    'level',
    ({ stroke }) => formatLevel(stroke.levelDb),
    ({ stroke }) => levelShare(stroke.levelDb),
    THEME.check,
  ),
];
