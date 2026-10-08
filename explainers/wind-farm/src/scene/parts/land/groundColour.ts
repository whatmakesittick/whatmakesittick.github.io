import { Color } from 'three';
import { smoothstep } from '@core/math';
import { FIELD_KINDS, GROUND } from './constants';
import { wavelengthNoise } from './noise';
import { createPatchSample, samplePatch } from './patchwork';
import type { PatchworkLayout } from './patchwork';
import { hash2 } from './random';

export interface GroundRules {
  wooded(x: number, z: number): boolean;
  hedged(x: number, z: number): boolean;
}

export const RGBA = 4;

const FIELD_COLOURS = FIELD_KINDS.map(({ colour }) => new Color(colour));
const TOTAL_WEIGHT = FIELD_KINDS.reduce((sum, { weight }) => sum + weight, 0);
const HEDGE = new Color(GROUND.hedge);
const CANOPY = new Color(GROUND.canopy);
const HAZE = new Color(GROUND.haze);
const HALF = 0.5;
const sample = createPatchSample();

function fieldColour(share: number): Color {
  let remaining = share * TOTAL_WEIGHT;
  const index = FIELD_KINDS.findIndex(({ weight }) => (remaining -= weight) < 0);
  return FIELD_COLOURS[index < 0 ? FIELD_COLOURS.length - 1 : index];
}

function mottle(x: number, z: number, layer: { wavelength: number; amount: number; seed: number }) {
  return 1 + (wavelengthNoise(x, z, layer.wavelength, layer.seed) - HALF) * layer.amount;
}

export function bandShare(
  distance: number,
  spacing: number,
  band: { readonly halfWidth: number; readonly coverage: number },
): number {
  const width = Math.max(band.halfWidth, spacing * GROUND.bandSpacingShare);
  const coverage = Math.max(band.coverage, band.halfWidth / width);
  return (1 - smoothstep(distance, width * GROUND.bandCore, width)) * coverage;
}

export function patchColour(
  layout: PatchworkLayout,
  rules: GroundRules,
  x: number,
  z: number,
  spacing: number,
  out: Color,
): Color {
  samplePatch(layout, x, z, sample);
  if (sample.wood && rules.wooded(x, z))
    return out.copy(CANOPY).multiplyScalar(mottle(x, z, GROUND.canopyMottle));
  const tone = 1 + (sample.tone - HALF) * GROUND.toneSpread;
  const across = 1 + (sample.across - HALF) * GROUND.acrossShade;
  out.copy(fieldColour(sample.field)).multiplyScalar(tone * across);
  if (sample.hedge && rules.hedged(x, z))
    out.lerp(HEDGE, bandShare(sample.edge, spacing, GROUND.hedgeBand));
  return out;
}

export function weather(x: number, z: number, out: Color): Color {
  const grain = 1 + (hash2(x, z, GROUND.grain.seed) - HALF) * GROUND.grain.amount;
  return out.multiplyScalar(mottle(x, z, GROUND.broad) * mottle(x, z, GROUND.mottle) * grain);
}

export function fadeToHaze(out: Color, share: number): Color {
  return out.lerp(HAZE, share);
}

export function writeColour(
  colours: Float32Array,
  index: number,
  colour: Color,
  alpha: number,
): void {
  colour.toArray(colours, index * RGBA);
  colours[index * RGBA + RGBA - 1] = alpha;
}
