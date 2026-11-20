import type { BufferGeometry, IUniform, Material } from 'three';
import { Float32BufferAttribute } from 'three';
import { clamp } from '@core/math';
import { heatAlong } from '../../model/heat';
import { LIP_X, ENGINE_LENGTH_M } from '../../model/scale';
import { unitsAt } from '../../model/stations';
import { HEAT_RAMP } from '../../theme';
import { HEAT_LOOK, LOOK } from '../constants';
import { addPatch, glslColor, glslFloat, inject } from './shaderChunks';

export interface HeatUniforms {
  readonly uHeat: IUniform<number>;
}

export interface GlowScale {
  readonly uGlowScale: IUniform<number>;
}

const HEAT_KEY = 'ge9x-heat';
const FULL_LEVER = 1;

export const HEAT_RAMP_GLSL = /* glsl */ `
vec3 heatRamp(float heat) {
  vec3 low = ${glslColor(HEAT_RAMP.low)};
  vec3 mid = ${glslColor(HEAT_RAMP.mid)};
  vec3 high = ${glslColor(HEAT_RAMP.high)};
  return heat < 0.5 ? mix(low, mid, heat * 2.0) : mix(mid, high, heat * 2.0 - 1.0);
}
`;

const VERTEX_HEAD = /* glsl */ `
attribute float heatProfile;
varying float vHeatProfile;
`;

const VERTEX_BODY = /* glsl */ `
vHeatProfile = heatProfile;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uHeat;
uniform float uGlowScale;
varying float vHeatProfile;
${HEAT_RAMP_GLSL}
`;

function fragmentBody(gain: number): string {
  return /* glsl */ `
float heatNow = clamp(vHeatProfile * uHeat, 0.0, 1.0);
totalEmissiveRadiance += heatRamp(heatNow) * pow(heatNow, ${glslFloat(HEAT_LOOK.curve)}) * ${glslFloat(gain * LOOK.glowGain)} * uGlowScale;
`;
}

export function createHeatUniforms(): HeatUniforms {
  return { uHeat: { value: 0 } };
}

export function createGlowScale(): GlowScale {
  return { uGlowScale: { value: 1 } };
}

export function applyHeat<M extends Material>(
  material: M,
  heat: HeatUniforms,
  scale: GlowScale,
  gain: number,
): M {
  return addPatch(material, `${HEAT_KEY}-${gain}`, (shader) => {
    shader.uniforms.uHeat = heat.uHeat;
    shader.uniforms.uGlowScale = scale.uGlowScale;
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
    shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', VERTEX_BODY);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <emissivemap_fragment>',
      fragmentBody(gain),
    );
  });
}

export function heatProfileAt(x: number): number {
  const fraction = clamp((x - LIP_X) / ENGINE_LENGTH_M, 0, 1);
  return heatAlong(unitsAt(fraction), FULL_LEVER);
}

export function withHeatProfile(geometry: BufferGeometry, scale = 1): BufferGeometry {
  const position = geometry.getAttribute('position');
  const values = Array.from(
    { length: position.count },
    (_, index) => heatProfileAt(position.getX(index)) * scale,
  );
  geometry.setAttribute('heatProfile', new Float32BufferAttribute(values, 1));
  return geometry;
}
