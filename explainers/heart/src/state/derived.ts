import type { PlaybackState } from '@core/explainer';
import type { ValveState } from '../ids';
import {
  aorticPressure,
  leftAtrialPressure,
  leftVentriclePressure,
  leftVentricleVolume,
  pulmonaryArteryPressure,
  rightAtrialPressure,
  rightVentriclePressure,
  valveState,
} from '../model';

type TimeState = Pick<PlaybackState, 'phase'>;

export interface Pressures {
  leftVentricle: number;
  aorta: number;
  leftAtrium: number;
  rightVentricle: number;
  pulmonaryArtery: number;
  rightAtrium: number;
}

export function timeOf(state: TimeState): number {
  return state.phase;
}

function rememberLast<T>(compute: (time: number) => T): (time: number) => T {
  let last: { time: number; value: T } | null = null;
  return (time) => {
    if (last?.time !== time) last = { time, value: compute(time) };
    return last.value;
  };
}

function pressuresAt(time: number): Pressures {
  return {
    leftVentricle: leftVentriclePressure(time),
    aorta: aorticPressure(time),
    leftAtrium: leftAtrialPressure(time),
    rightVentricle: rightVentriclePressure(time),
    pulmonaryArtery: pulmonaryArteryPressure(time),
    rightAtrium: rightAtrialPressure(time),
  };
}

const latestPressures = rememberLast(pressuresAt);

export function pressuresOf(state: TimeState): Readonly<Pressures> {
  return latestPressures(timeOf(state));
}

export function volumeOf(state: TimeState): number {
  return leftVentricleVolume(timeOf(state));
}

export function valveStateOf(state: TimeState): ValveState {
  return valveState(timeOf(state));
}
