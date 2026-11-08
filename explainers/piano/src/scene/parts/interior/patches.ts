import type { Color, IUniform, Material } from 'three';
import { glslFloat, inject } from '../shaderChunks';

export interface ShaderPatch {
  readonly key: string;
  readonly head: string;
  readonly body: string;
  readonly uniforms: object;
  readonly fragment?: FragmentPatch;
}

interface FragmentPatch {
  readonly head: string;
  readonly body: string;
  readonly anchor?: string;
}

export type Triple = [number, number, number];

export interface SwingUniforms {
  readonly uSwing: IUniform<Triple>;
}

export interface WaveUniforms extends SwingUniforms {
  readonly uWaveAmp: IUniform<Triple>;
  readonly uWavePhase: IUniform<number>;
  readonly uWaveInflate: IUniform<number>;
  readonly uWaveGlow: IUniform<Color>;
}

export interface ShimmerUniforms {
  readonly uShimmer: IUniform<number>;
  readonly uShimmerPhase: IUniform<number>;
}

export interface BreathUniforms {
  readonly uBreath: IUniform<number>;
  readonly uBoardMode: IUniform<[number, number, number, number]>;
}

export interface GlowUniforms {
  readonly uGlow: IUniform<[number, number, number, number]>;
}

export interface BlurUniforms extends SwingUniforms {
  readonly uBlurReach: IUniform<number>;
}

export interface GlowLook {
  readonly colour: readonly [number, number, number];
  readonly radius: number;
  readonly ringSpacing: number;
  readonly ringShare: number;
  readonly tint: number;
  readonly glow: number;
}

export const SECOND_MODE = { share: 0.22, lag: 0.9 } as const;
const BLUR_EDGE = { floor: 0.28, power: 3 } as const;
const EMISSIVE_ANCHOR = '#include <emissivemap_fragment>';
const ALPHA_ANCHOR = '#include <alphamap_fragment>';
const MAP_ANCHOR = '#include <map_fragment>';

function vec3(colour: readonly [number, number, number]): string {
  return `vec3(${colour.map((channel) => glslFloat(channel)).join(', ')})`;
}

export function patchShader<M extends Material>(material: M, patch: ShaderPatch): M {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, patch.uniforms);
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', patch.head);
    shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', patch.body);
    if (!patch.fragment) return;
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', patch.fragment.head);
    const anchor = patch.fragment.anchor ?? EMISSIVE_ANCHOR;
    shader.fragmentShader = inject(shader.fragmentShader, anchor, patch.fragment.body);
  };
  material.customProgramCacheKey = () => patch.key;
  return material;
}

const WAVE_SHAPE = /* glsl */ `
float waveShape(float along, float phase) {
  float at = along * PI;
  return sin(at) * cos(phase)
    + ${glslFloat(SECOND_MODE.share)} * sin(2.0 * at) * cos(2.0 * phase + ${glslFloat(SECOND_MODE.lag)});
}
float waveReach(float along) {
  float at = along * PI;
  return abs(sin(at)) + ${glslFloat(SECOND_MODE.share)} * abs(sin(2.0 * at));
}
`;

export function wavePatch(uniforms: WaveUniforms): ShaderPatch {
  return {
    key: 'piano-wave',
    uniforms,
    head: /* glsl */ `
attribute vec2 aWave;
uniform vec3 uSwing;
uniform vec3 uWaveAmp;
uniform float uWavePhase;
uniform float uWaveInflate;
${WAVE_SHAPE}
`,
    body: /* glsl */ `
transformed += objectNormal * uWaveInflate;
if (aWave.x >= 0.0) {
  float waveAmp = aWave.y < 0.5 ? uWaveAmp.x : (aWave.y < 1.5 ? uWaveAmp.y : uWaveAmp.z);
  transformed += uSwing * waveAmp * waveShape(aWave.x, uWavePhase);
}
`,
    fragment: {
      head: 'uniform vec3 uWaveGlow;',
      body: 'totalEmissiveRadiance += uWaveGlow;',
    },
  };
}

export function blurPatch(uniforms: BlurUniforms): ShaderPatch {
  return {
    key: 'piano-blur',
    uniforms,
    head: /* glsl */ `
attribute vec2 aBlur;
uniform vec3 uSwing;
uniform float uBlurReach;
varying float vBlurSide;
${WAVE_SHAPE}
`,
    body: /* glsl */ `
transformed += uSwing * aBlur.y * uBlurReach * waveReach(aBlur.x);
vBlurSide = aBlur.y;
`,
    fragment: {
      head: 'varying float vBlurSide;',
      body: `diffuseColor.a *= mix(${glslFloat(BLUR_EDGE.floor)}, 1.0, pow(abs(vBlurSide), ${glslFloat(BLUR_EDGE.power)}));`,
      anchor: ALPHA_ANCHOR,
    },
  };
}

export function shimmerPatch(uniforms: ShimmerUniforms): ShaderPatch {
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

const BREATH_HEAD = /* glsl */ `
uniform float uBreath;
uniform vec4 uBoardMode;
`;

const BREATH_BODY = /* glsl */ `
vec4 breathWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
breathWorld = instanceMatrix * breathWorld;
#endif
breathWorld = modelMatrix * breathWorld;
vec2 breathAt = (breathWorld.xz - uBoardMode.xy) * uBoardMode.zw;
transformed.y += uBreath * max(0.0, 1.0 - dot(breathAt, breathAt));
`;

export function breathPatch(uniforms: BreathUniforms): ShaderPatch {
  return { key: 'piano-breath', uniforms, head: BREATH_HEAD, body: BREATH_BODY };
}

export function boardPatch(uniforms: BreathUniforms & GlowUniforms, look: GlowLook): ShaderPatch {
  const ringWave = (2 * Math.PI) / look.ringSpacing;
  return {
    key: 'piano-board',
    uniforms,
    head: `${BREATH_HEAD}varying vec2 vBoardAt;`,
    body: `${BREATH_BODY}vBoardAt = breathWorld.xz;`,
    fragment: {
      head: /* glsl */ `
uniform vec4 uGlow;
varying vec2 vBoardAt;
`,
      body: /* glsl */ `
float glowReach = length(vBoardAt - uGlow.xy) / ${glslFloat(look.radius)};
float glowRings = 0.5 + 0.5 * cos(glowReach * ${glslFloat(ringWave * look.radius)} - uGlow.w);
float glowPulse = 0.5 + 0.5 * cos(uGlow.w);
float glowAmount = clamp(uGlow.z * exp(-glowReach * glowReach)
  * mix(glowPulse, glowRings, ${glslFloat(look.ringShare)}), 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, ${vec3(look.colour)}, glowAmount * ${glslFloat(look.tint)});
totalEmissiveRadiance += ${vec3(look.colour)} * glowAmount * ${glslFloat(look.glow)};
`,
      anchor: MAP_ANCHOR,
    },
  };
}
