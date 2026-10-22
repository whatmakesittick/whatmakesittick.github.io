import type { Readout } from '@core/explainer';
import type { ReadoutText } from '@core/ui/liveReadouts';
import { clamp } from '@core/math';
import { LIFT_TRAVEL_MM, LINE_M } from '../model';
import { createLiveReader } from '../state';
import type { LiveReading, MaglevTrainStoreState } from '../state';
import { THEME } from '../theme';
import { formatClockOf, formatGap, formatKmOf, formatUnit } from './format';

export type ChapterReadouts = Readonly<Record<string, ReadoutText<MaglevTrainStoreState>>>;

const read = createLiveReader();

function readout(
  id: string,
  value: (reading: LiveReading) => string,
  share: (reading: LiveReading) => number,
  fill: string,
): Readout<MaglevTrainStoreState> {
  return {
    id,
    labelKey: `readouts.${id}`,
    numeric: true,
    value: (state) => value(read(state)),
    meter: { share: (state) => clamp(share(read(state)), 0, 1), fill },
  };
}

export const MAGLEV_TRAIN_READOUTS: readonly Readout<MaglevTrainStoreState>[] = [
  readout(
    'speed',
    ({ motion }) => formatUnit('kmh', motion.speedKmh),
    ({ motion, topMs }) => motion.speedMs / topMs,
    THEME.drive,
  ),
  readout(
    'distance',
    ({ motion }) => formatKmOf(motion.distance, LINE_M),
    ({ motion }) => motion.distance / LINE_M,
    THEME.cruise,
  ),
  readout(
    'time',
    ({ motion, tripSeconds }) => formatClockOf(motion.realSeconds, tripSeconds),
    ({ motion, tripSeconds }) => motion.realSeconds / tripSeconds,
    THEME.powered,
  ),
  readout(
    'gap',
    ({ motion }) => formatGap(motion),
    ({ motion }) => motion.liftMm / LIFT_TRAVEL_MM,
    THEME.lift,
  ),
];
