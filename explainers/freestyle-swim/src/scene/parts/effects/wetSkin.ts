import type { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from 'three';
import type { PoolFrame } from '../pool/constants';
import { CAUSTIC_GLSL } from '../pool/shaders';

const SURFACE_BAND_M = 0.06;
const DEPTH_SCALE_M = 1.6;
const CACHE_KEY = 'swimmerWetSkin';
const ROOM_LIGHT_SHARE = 0.3;

const VERTEX_DECLARATIONS = /* glsl */ `
varying vec3 vWetWorld;
#include <common>`;

const VERTEX_WORLD = /* glsl */ `
#include <begin_vertex>
vWetWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`;

const FRAGMENT_DECLARATIONS = /* glsl */ `
varying vec3 vWetWorld;
uniform float uScroll;
uniform float uPhase;
const float TAU = 6.2831853;
const float PERIOD = 0.3;
${CAUSTIC_GLSL}
#include <common>`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
float wetBelow = 1.0 - smoothstep(-${SURFACE_BAND_M}, ${SURFACE_BAND_M}, vWetWorld.y);
roughnessFactor *= mix(0.8, 1.0, wetBelow);`;

const FRAGMENT_TINT = /* glsl */ `
vec3 wetNormal = inverseTransformDirection(normal, viewMatrix);
float wetDepth = clamp(-vWetWorld.y / ${DEPTH_SCALE_M.toFixed(2)}, 0.0, 1.0);
vec3 deep = mix(vec3(0.8, 0.87, 0.93), vec3(0.42, 0.58, 0.76), wetDepth);
float skyward = smoothstep(-0.7, 0.8, wetNormal.y);
float lit = caustic(vec2(vWetWorld.x - uScroll, vWetWorld.z)) * (0.35 + 0.65 * max(wetNormal.y, 0.0));
vec3 underwater = outgoingLight * deep * mix(0.6, 1.0, skyward) + vec3(0.35, 0.7, 0.9) * lit * 0.1;
outgoingLight = mix(outgoingLight, underwater, wetBelow);
vec3 wetView = normalize(vViewPosition);
float sheen = pow(1.0 - max(dot(normal, wetView), 0.0), 3.0);
outgoingLight += vec3(0.9, 0.96, 1.0) * sheen * 0.1 * (1.0 - wetBelow);
#include <opaque_fragment>`;

export function applyWetSkin(material: MeshStandardMaterial, uniforms: PoolFrame): void {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERTEX_DECLARATIONS)
      .replace('#include <begin_vertex>', VERTEX_WORLD);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_DECLARATIONS)
      .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS)
      .replace('#include <opaque_fragment>', FRAGMENT_TINT);
  };
  material.envMapIntensity = ROOM_LIGHT_SHARE;
  material.customProgramCacheKey = () => CACHE_KEY;
  material.needsUpdate = true;
}
