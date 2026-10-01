import type { PlaybackState } from '@core/explainer';
import type { GasPortId, MotionReading, ShotReading } from '../ids';
import { motionAt, msAt, shotAt } from '../model';
import type { RifleFields } from './store';

type CycleState = Pick<PlaybackState, 'phase'> & Pick<RifleFields, 'gasPort'>;

export interface CycleReading {
  ms: number;
  shot: ShotReading;
  motion: MotionReading;
}

interface Remembered {
  phase: number;
  gasPort: GasPortId;
  reading: CycleReading;
}

function readingAt(phase: number, gasPort: GasPortId): CycleReading {
  const ms = msAt(phase);
  return { ms, shot: shotAt(ms, gasPort), motion: motionAt(ms, gasPort) };
}

let last: Remembered | null = null;

export function cycleOf({ phase, gasPort }: CycleState): Readonly<CycleReading> {
  if (last?.phase !== phase || last.gasPort !== gasPort) {
    last = { phase, gasPort, reading: readingAt(phase, gasPort) };
  }
  return last.reading;
}
