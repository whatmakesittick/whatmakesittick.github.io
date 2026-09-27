import { Color } from 'three';
import { FULL_TURN } from '@core/math';
import { AIR_TONES, PARTICLES, TERRAIN, WAVE } from './constants';
import { CREST_HEIGHT, ridgeShare, terrainHeight } from './terrain';

const NEUTRAL = new Color(AIR_TONES.neutral);
const RISING = new Color(AIR_TONES.rising);
const SINKING = new Color(AIR_TONES.sinking);
export const SLOPE_STEP = 0.5;

export const WINDWARD_SLOPE = CREST_HEIGHT / TERRAIN.windwardRun;
export const WAVE_STEEPEST = (WAVE.peakAmplitude * FULL_TURN) / WAVE.wavelength;

function waveShape(x: number): number {
  if (x <= 0) return ridgeShare(x);
  if (x <= WAVE.troughX) return Math.cos((Math.PI * x) / WAVE.troughX);
  const beyond = x - WAVE.troughX;
  return -Math.cos((FULL_TURN * beyond) / WAVE.wavelength) * Math.exp(-beyond / WAVE.damping);
}

function waveAmplitude(height: number): number {
  const share = (height - WAVE.amplitudeFloor) / WAVE.amplitudeSpan;
  return WAVE.peakAmplitude * Math.max(0, Math.sin(Math.PI * share));
}

export function waveY(x: number, height: number): number {
  return height + waveAmplitude(height) * waveShape(x);
}

export function ridgeFlowY(x: number, z: number, clearance: number): number {
  return terrainHeight(x, z) + clearance;
}

export function slopeOf(curve: (x: number) => number, x: number): number {
  return (curve(x + SLOPE_STEP) - curve(x - SLOPE_STEP)) / (2 * SLOPE_STEP);
}

export function edgeFade(progress: number, edge: number): number {
  return Math.min(1, progress / edge, (1 - progress) / edge);
}

export function airTone(slope: number, target: Color): Color {
  const share = Math.min(1, Math.abs(slope) / PARTICLES.slopeForFullTone);
  return target.copy(NEUTRAL).lerp(slope >= 0 ? RISING : SINKING, share);
}
