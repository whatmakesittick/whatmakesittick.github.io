import type { IUniform, Material } from 'three';
import { glslFloat, inject } from '../shaderChunks';

export interface VertexPatch {
  readonly key: string;
  readonly head: string;
  readonly body: string;
  readonly uniforms: object;
}

export interface WaveUniforms {
  readonly uWaveAmp: IUniform<[number, number, number]>;
  readonly uWavePhase: IUniform<number>;
}

export interface ShimmerUniforms {
  readonly uShimmer: IUniform<number>;
  readonly uShimmerPhase: IUniform<number>;
}

export interface BreathUniforms {
  readonly uBreath: IUniform<number>;
  readonly uBoardMode: IUniform<[number, number, number, number]>;
}

export const SECOND_MODE = { share: 0.22, lag: 0.9 } as const;

export function patchVertex<M extends Material>(material: M, patch: VertexPatch): M {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, patch.uniforms);
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', patch.head);
    shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', patch.body);
  };
  material.customProgramCacheKey = () => patch.key;
  return material;
}

export function wavePatch(uniforms: WaveUniforms): VertexPatch {
  return {
    key: 'piano-wave',
    uniforms,
    head: /* glsl */ `
attribute vec2 aWave;
uniform vec3 uWaveAmp;
uniform float uWavePhase;
`,
    body: /* glsl */ `
if (aWave.x >= 0.0) {
  float waveAmp = aWave.y < 0.5 ? uWaveAmp.x : (aWave.y < 1.5 ? uWaveAmp.y : uWaveAmp.z);
  float waveAt = aWave.x * PI;
  transformed.y += waveAmp * (sin(waveAt) * cos(uWavePhase)
    + ${glslFloat(SECOND_MODE.share)} * sin(2.0 * waveAt) * cos(2.0 * uWavePhase + ${glslFloat(SECOND_MODE.lag)}));
}
`,
  };
}

export function shimmerPatch(uniforms: ShimmerUniforms): VertexPatch {
  return {
    key: 'piano-shimmer',
    uniforms,
    head: /* glsl */ `
attribute vec3 aShimmer;
uniform float uShimmer;
uniform float uShimmerPhase;
`,
    body: /* glsl */ `
float shimmerAt = (position.z - aShimmer.x) / max(aShimmer.y - aShimmer.x, 0.0001);
if (shimmerAt > 0.0 && shimmerAt < 1.0) {
  transformed.y += uShimmer * sin(shimmerAt * PI) * sin(uShimmerPhase + aShimmer.z);
}
`,
  };
}

export function breathPatch(uniforms: BreathUniforms): VertexPatch {
  return {
    key: 'piano-breath',
    uniforms,
    head: /* glsl */ `
uniform float uBreath;
uniform vec4 uBoardMode;
`,
    body: /* glsl */ `
vec4 breathWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
breathWorld = instanceMatrix * breathWorld;
#endif
breathWorld = modelMatrix * breathWorld;
vec2 breathAt = (breathWorld.xz - uBoardMode.xy) * uBoardMode.zw;
transformed.y += uBreath * max(0.0, 1.0 - dot(breathAt, breathAt));
`,
  };
}
