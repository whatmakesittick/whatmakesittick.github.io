import type { PlaybackState } from '@core/explainer';
import type { ValveState } from '../ids';
import {
  aorticPressure,
  cardiacOutput,
  heartRate,
  leftAtrialPressure,
  leftVentriclePressure,
  leftVentricleVolume,
  pulmonaryArteryPressure,
  rightAtrialPressure,
  rightVentriclePressure,
  valveState,
} from '../model';
import type { HeartFields } from './store';

type TimeState = Pick<PlaybackState, 'phase'>;
type EffortState = Pick<HeartFields, 'effort' | 'fitness'>;

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

export function heartRateOf(state: EffortState): number {
  return heartRate(state.effort, state.fitness);
}

export function outputOf(state: EffortState): number {
  return cardiacOutput(state.effort, state.fitness);
}
