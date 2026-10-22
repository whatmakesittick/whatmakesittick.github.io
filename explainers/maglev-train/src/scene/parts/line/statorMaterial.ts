import { MeshStandardMaterial } from 'three';
import type { IUniform, WebGLProgramParametersWithUniforms } from 'three';
import { FINISHES } from '../../finishes';
import { glslFloat, inject } from '../shaderChunks';
import { PACKS } from './constants';
import { applyCut } from './cut';
import type { CutUniform } from './cut';
import { STATOR_SHADING } from './effectConstants';
import { WAVE_GLSL } from './glsl';
import type { WaveUniforms } from './waveUniforms';

const CACHE_KEY = 'maglev-stator-pack';

const PRECISE_DIGITS = 6;
const precise = (value: number) => glslFloat(value, PRECISE_DIGITS);

const VERTEX_HEAD = /* glsl */ `
varying vec3 vStatorWorld;
varying vec3 vStatorLocal;
varying vec3 vStatorNormal;
`;

const VERTEX_BODY = /* glsl */ `
vStatorWorld = (modelMatrix * cutWorld).xyz;
vStatorLocal = position;
vStatorNormal = normal;
`;

const FRAGMENT_HEAD = /* glsl */ `
${WAVE_GLSL}
uniform float uDetail;
varying vec3 vStatorWorld;
varying vec3 vStatorLocal;
varying vec3 vStatorNormal;

float statorLines(float coordinate, float width) {
  float fw = fwidth(coordinate);
  float dist = 0.5 - abs(fract(coordinate) - 0.5);
  float line = 1.0 - smoothstep(width, width + fw, dist);
  return line * (1.0 - smoothstep(0.12, 0.4, fw));
}

float statorSlots(float coordinate) {
  float fw = fwidth(coordinate);
  float slot = 1.0 - smoothstep(0.22 - fw, 0.22 + fw, abs(fract(coordinate) - 0.5));
  return mix(slot, 0.44, smoothstep(0.2, 0.7, fw));
}
`;

const COLOUR_BODY = /* glsl */ `
vec3 statorNormal = normalize(vStatorNormal);
float statorAlong = 1.0 - abs(statorNormal.x);
float statorBottom = step(0.5, -statorNormal.y);
float statorPlates = statorLines(vStatorLocal.x / ${precise(PACKS.pitch / PACKS.platesPerPack)}, ${precise(STATOR_SHADING.plateWidth)});
float statorCable = statorSlots(vStatorLocal.x / ${precise(PACKS.slotPitch)}) * statorBottom;
float statorRim = (1.0 - statorBottom) * statorAlong * (1.0 - step(${precise(PACKS.bottom + STATOR_SHADING.cableBand)}, vStatorLocal.y));
diffuseColor.rgb *= 1.0 - ${precise(STATOR_SHADING.plateShade)} * statorPlates * statorAlong * uDetail;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${precise(STATOR_SHADING.cableColour)}), ${precise(STATOR_SHADING.slotShade)} * max(statorCable, statorRim * uDetail));
`;

const EMISSIVE_BODY = /* glsl */ `
float statorWave = uWaveOn * sectionMask(vStatorWorld.x) * mix(${precise(STATOR_SHADING.endFaceGlow)}, 1.0, statorAlong);
diffuseColor.rgb *= 1.0 - ${precise(STATOR_SHADING.bandShade)} * statorWave;
totalEmissiveRadiance += waveBand(vStatorWorld.x) * ${precise(STATOR_SHADING.bandGlow)} * statorWave;
`;

export interface StatorUniforms extends WaveUniforms {
  uDetail: IUniform<number>;
}

export function createStatorMaterial(
  uniforms: StatorUniforms,
  cut: CutUniform,
): MeshStandardMaterial {
  const material = new MeshStandardMaterial(FINISHES.stator);
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
    shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', VERTEX_BODY);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <color_fragment>', COLOUR_BODY);
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <emissivemap_fragment>',
      EMISSIVE_BODY,
    );
    applyCut(shader, cut);
  };
  material.customProgramCacheKey = () => CACHE_KEY;
  return material;
}
