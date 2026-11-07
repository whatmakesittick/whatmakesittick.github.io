import { FULL_TURN } from '@core/math';
import type { AssemblyState, RegisterId } from '../../../ids';
import { PLAYED_KEY, speakingLength } from '../../../model';
import { STILL_SHARE } from '../../constants';
import type { Frame } from '../context';
import { BOARD_MODE } from './boardPlan';
import { breathPatch, shimmerPatch, wavePatch } from './patches';
import type { BreathUniforms, ShimmerUniforms, VertexPatch, WaveUniforms } from './patches';

const DRAWN_HZ: Readonly<Record<RegisterId, number>> = { bass: 2.2, middle: 3, treble: 4 };
const WAVE = { peak: 0.005, referenceLength: 0.62, lengthPower: 0.5, unstruck: 0.25 } as const;
const BREATH_PEAK = 0.0015;
const SHIMMER = { gain: 5, hz: 5.5 } as const;
const UNISON_SLOTS = 3;

export interface WaveEffects {
  readonly wave: VertexPatch;
  readonly shimmer: VertexPatch;
  readonly breath: VertexPatch;
  setState(state: AssemblyState): void;
  animate(frame: Frame, state: AssemblyState): boolean;
}

export function isRinging(state: AssemblyState): boolean {
  const { stringShare, sympathyShare } = state.stroke;
  return state.view.wave && (stringShare > STILL_SHARE || sympathyShare > STILL_SHARE);
}

export function wavePeak(state: AssemblyState): number {
  if (!state.view.wave) return 0;
  const length = speakingLength(PLAYED_KEY[state.register]);
  return WAVE.peak * (length / WAVE.referenceLength) ** WAVE.lengthPower * state.stroke.stringShare;
}

export function unisonAmplitudes(state: AssemblyState): [number, number, number] {
  const peak = wavePeak(state);
  const unstruck = state.stroke.strings - state.stroke.stringsStruck;
  const amplitudes = Array.from({ length: UNISON_SLOTS }, (_, slot) =>
    slot < unstruck ? peak * WAVE.unstruck : peak,
  );
  return [amplitudes[0], amplitudes[1], amplitudes[2]];
}

export function createWave(): WaveEffects {
  const waveUniforms: WaveUniforms = {
    uWaveAmp: { value: [0, 0, 0] },
    uWavePhase: { value: 0 },
  };
  const shimmerUniforms: ShimmerUniforms = { uShimmer: { value: 0 }, uShimmerPhase: { value: 0 } };
  const breathUniforms: BreathUniforms = {
    uBreath: { value: 0 },
    uBoardMode: { value: BOARD_MODE },
  };
  let breathPeak = 0;
  const breathe = () => {
    breathUniforms.uBreath.value = breathPeak * Math.cos(waveUniforms.uWavePhase.value);
  };
  return {
    wave: wavePatch(waveUniforms),
    shimmer: shimmerPatch(shimmerUniforms),
    breath: breathPatch(breathUniforms),
    setState(state) {
      const on = state.view.wave;
      waveUniforms.uWaveAmp.value = unisonAmplitudes(state);
      breathPeak = on ? BREATH_PEAK * state.stroke.stringShare : 0;
      shimmerUniforms.uShimmer.value = on
        ? WAVE.peak * SHIMMER.gain * state.stroke.sympathyShare
        : 0;
      breathe();
    },
    animate(frame, state) {
      if (!isRinging(state)) return false;
      waveUniforms.uWavePhase.value = FULL_TURN * DRAWN_HZ[state.register] * frame.elapsed;
      shimmerUniforms.uShimmerPhase.value = FULL_TURN * SHIMMER.hz * frame.elapsed;
      breathe();
      return true;
    },
  };
}
