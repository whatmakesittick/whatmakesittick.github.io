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

export function pressuresOf(state: TimeState): Pressures {
  const time = timeOf(state);
  return {
    leftVentricle: leftVentriclePressure(time),
    aorta: aorticPressure(time),
    leftAtrium: leftAtrialPressure(time),
    rightVentricle: rightVentriclePressure(time),
    pulmonaryArtery: pulmonaryArteryPressure(time),
    rightAtrium: rightAtrialPressure(time),
  };
}

export function volumeOf(state: TimeState): number {
  return leftVentricleVolume(timeOf(state));
}

export function valveStateOf(state: TimeState): ValveState {
  return valveState(timeOf(state));
}
