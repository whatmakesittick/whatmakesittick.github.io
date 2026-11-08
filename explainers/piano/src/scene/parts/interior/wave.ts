import { Color } from 'three';
import { FULL_TURN, toRadians } from '@core/math';
import type { AssemblyState, RegisterId } from '../../../ids';
import { PLAYED_KEY, stringDirection, stringPath } from '../../../model';
import { THEME } from '../../../theme';
import { STILL_SHARE } from '../../constants';
import type { Frame } from '../context';
import { BOARD_MODE } from './boardPlan';
import { blurPatch, boardPatch, breathPatch, shimmerPatch, wavePatch } from './patches';
import type {
  BlurUniforms,
  BreathUniforms,
  GlowLook,
  GlowUniforms,
  ShaderPatch,
  ShimmerUniforms,
  SwingUniforms,
  Triple,
  WaveUniforms,
} from './patches';

interface DrawnSwing {
  readonly reach: number;
  readonly tiltDeg: number;
  readonly hz: number;
}

const SWING: Readonly<Record<RegisterId, DrawnSwing>> = {
  bass: { reach: 0.042, tiltDeg: -50, hz: 2.2 },
  middle: { reach: 0.028, tiltDeg: 35, hz: 3 },
  treble: { reach: 0.014, tiltDeg: 35, hz: 4 },
};
const UNSTRUCK_SHARE = 0.25;
const LOUDNESS_POWER = 0.5;
const BREATH_PEAK = 0.0015;
const SHIMMER = { peak: 0.025, hz: 5.5 } as const;
const UNISON_SLOTS = 3;
const INFLATE = 0.0009;
const STRING_GLOW = { rest: 0.3, ringing: 0.8 } as const;
const BOARD_GLOW = { strength: 2.4 } as const;
const RING_TONE = new Color(THEME.check);
const STEEL_TONE = new Color(THEME.steel);
const ringTone = new Color();
const GLOW_LOOK: GlowLook = {
  colour: [RING_TONE.r, RING_TONE.g, RING_TONE.b],
  radius: 0.7,
  ringSpacing: 0.15,
  ringShare: 0.7,
  tint: 0.7,
  glow: 0.3,
};

export interface WaveEffects {
  readonly wave: ShaderPatch;
  readonly blur: ShaderPatch;
  readonly shimmer: ShaderPatch;
  readonly breath: ShaderPatch;
  readonly board: ShaderPatch;
  setState(state: AssemblyState): void;
  animate(frame: Frame, state: AssemblyState): boolean;
}

export function isRinging(state: AssemblyState): boolean {
  const { stringShare, sympathyShare } = state.stroke;
  return state.view.wave && (stringShare > STILL_SHARE || sympathyShare > STILL_SHARE);
}

function drawnShare(state: AssemblyState): number {
  return state.stroke.stringShare ** LOUDNESS_POWER;
}

export function wavePeak(state: AssemblyState): number {
  if (!state.view.wave) return 0;
  return SWING[state.register].reach * drawnShare(state);
}

export function swingFor(register: RegisterId): Triple {
  const [dx, , dz] = stringDirection(PLAYED_KEY[register]);
  const tilt = toRadians(SWING[register].tiltDeg);
  const lean = Math.sin(tilt);
  return [-dz * lean, Math.cos(tilt), dx * lean];
}

export function unisonAmplitudes(state: AssemblyState): Triple {
  const peak = wavePeak(state);
  const unstruck = state.stroke.strings - state.stroke.stringsStruck;
  const amplitudes = Array.from({ length: UNISON_SLOTS }, (_, slot) =>
    slot < unstruck ? peak * UNSTRUCK_SHARE : peak,
  );
  return [amplitudes[0], amplitudes[1], amplitudes[2]];
}

function stringGlow(state: AssemblyState, target: Color): Color {
  if (!state.view.wave) return target.setScalar(0);
  const ringing = STRING_GLOW.ringing * drawnShare(state);
  return target
    .copy(STEEL_TONE)
    .multiplyScalar(STRING_GLOW.rest)
    .add(ringTone.copy(RING_TONE).multiplyScalar(ringing));
}

export function createWave(): WaveEffects {
  const swing: SwingUniforms = { uSwing: { value: [0, 1, 0] } };
  const waveUniforms: WaveUniforms = {
    ...swing,
    uWaveAmp: { value: [0, 0, 0] },
    uWavePhase: { value: 0 },
    uWaveInflate: { value: 0 },
    uWaveGlow: { value: new Color(0, 0, 0) },
  };
  const blurUniforms: BlurUniforms = { ...swing, uBlurReach: { value: 0 } };
  const shimmerUniforms: ShimmerUniforms = { uShimmer: { value: 0 }, uShimmerPhase: { value: 0 } };
  const breathUniforms: BreathUniforms = {
    uBreath: { value: 0 },
    uBoardMode: { value: BOARD_MODE },
  };
  const glowUniforms: GlowUniforms = { uGlow: { value: [0, 0, 0, 0] } };
  let breathPeak = 0;
  const breathe = () => {
    const phase = waveUniforms.uWavePhase.value;
    breathUniforms.uBreath.value = breathPeak * Math.cos(phase);
    glowUniforms.uGlow.value[3] = phase;
  };
  return {
    wave: wavePatch(waveUniforms),
    blur: blurPatch(blurUniforms),
    shimmer: shimmerPatch(shimmerUniforms),
    breath: breathPatch(breathUniforms),
    board: boardPatch({ ...breathUniforms, ...glowUniforms }, GLOW_LOOK),
    setState(state) {
      const on = state.view.wave;
      const share = drawnShare(state);
      const amplitudes = unisonAmplitudes(state);
      const [x, , z] = stringPath(PLAYED_KEY[state.register]).back;
      swing.uSwing.value = swingFor(state.register);
      waveUniforms.uWaveAmp.value = amplitudes;
      waveUniforms.uWaveInflate.value = on ? INFLATE : 0;
      stringGlow(state, waveUniforms.uWaveGlow.value);
      blurUniforms.uBlurReach.value = Math.max(...amplitudes);
      breathPeak = on ? BREATH_PEAK * share : 0;
      glowUniforms.uGlow.value = [x, z, on ? BOARD_GLOW.strength * share : 0, 0];
      shimmerUniforms.uShimmer.value = on ? SHIMMER.peak * state.stroke.sympathyShare : 0;
      breathe();
    },
    animate(frame, state) {
      if (!isRinging(state)) return false;
      waveUniforms.uWavePhase.value = FULL_TURN * SWING[state.register].hz * frame.elapsed;
      shimmerUniforms.uShimmerPhase.value = FULL_TURN * SHIMMER.hz * frame.elapsed;
      breathe();
      return true;
    },
  };
}
