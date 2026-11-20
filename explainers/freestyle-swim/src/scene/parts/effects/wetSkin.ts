import type { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from 'three';
import type { PoolFrame } from '../pool/constants';
import { CAUSTIC_GLSL } from '../pool/shaders';

const SURFACE_BAND_M = 0.06;
const DEPTH_SCALE_M = 1.6;
const CACHE_KEY = 'swimmerWetSkin';
const ROOM_LIGHT_SHARE = 0.3;
const FLOOR_BOUNCE = 0.55;
const CAUSTIC_GAIN = 0.4;

function glsl(value: number): string {
  return value.toFixed(3);
}

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
float wetDepth = clamp(-vWetWorld.y / ${glsl(DEPTH_SCALE_M)}, 0.0, 1.0);
vec3 deep = mix(vec3(0.88, 0.93, 0.97), vec3(0.5, 0.64, 0.8), wetDepth);
float fromBelow = 0.5 - 0.5 * wetNormal.y;
vec3 bounce = vec3(0.62, 0.84, 0.95) * fromBelow * fromBelow * ${glsl(FLOOR_BOUNCE)};
float lit = caustic(vec2(vWetWorld.x - uScroll, vWetWorld.z)) * (0.25 + 0.75 * max(wetNormal.y, 0.0));
vec3 underwater = (outgoingLight + diffuseColor.rgb * (bounce + lit * ${glsl(CAUSTIC_GAIN)})) * deep;
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
