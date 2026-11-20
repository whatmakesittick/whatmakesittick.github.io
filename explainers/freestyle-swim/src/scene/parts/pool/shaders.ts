import { Color, FrontSide, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import type { IUniform, Side } from 'three';
import { THEME } from '../../../theme';
import { registered } from '../context';
import type { PartContext } from '../context';

const VERTEX = /* glsl */ `
#include <fog_pars_vertex>
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const FRAGMENT_HEAD = /* glsl */ `
#include <fog_pars_fragment>
varying vec3 vWorld;
varying vec2 vUv;
uniform float uScroll;
uniform float uPhase;
const float TAU = 6.2831853;
const float PERIOD = 0.3;
`;

export const FRAGMENT_TAIL = /* glsl */ `
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export const CAUSTIC_GLSL = /* glsl */ `
float caustic(vec2 p) {
  float ax = 0.5 * TAU * p.x / PERIOD;
  float t = uPhase;
  float w1 = 1.5 * sin(p.y * 5.1 + t) + sin(p.y * 2.3 - 2.0 * t + 1.0) + 0.6 * sin(2.0 * ax + p.y * 3.0);
  float w2 = 1.4 * sin(p.y * 7.3 - t + 2.0) + 0.9 * sin(p.y * 3.7 + 3.0 * t) + 0.5 * sin(ax + p.y * 4.0 - t);
  float w3 = 1.2 * sin(p.y * 4.3 + 2.0 * t + 0.5) + 0.8 * sin(p.y * 9.1 - t);
  float f1 = 1.0 - abs(sin(ax + w1));
  float f2 = 1.0 - abs(sin(2.0 * ax + w2));
  float f3 = 1.0 - abs(sin(3.0 * ax + w3));
  return pow(f1 * f2, 3.0) + 0.7 * pow(f2 * f3, 3.0);
}
`;

const WATER_DEEP = new Color(THEME.water).lerp(new Color(THEME.pull), 0.25).multiplyScalar(0.5);
const WATER_LIT = new Color(THEME.water).lerp(new Color(THEME.waterClear), 0.35);
const WATER_FADE_PER_M = 0.24;

export const WATER_GLSL = /* glsl */ `
uniform vec3 uWaterDeep;
uniform vec3 uWaterLit;
vec3 waterHorizon() {
  return mix(uWaterLit, uWaterDeep, 0.45);
}
vec3 waterFade(vec3 col) {
  float reach = length(cameraPosition - vWorld);
  float rise = cameraPosition.y - vWorld.y;
  float wet = rise > 0.0 ? clamp(-vWorld.y / rise, 0.0, 1.0) : 1.0;
  return mix(col, waterHorizon(), 1.0 - exp(-reach * wet * ${WATER_FADE_PER_M}));
}
`;

export function waterUniforms(): Record<string, IUniform> {
  return { uWaterDeep: { value: WATER_DEEP }, uWaterLit: { value: WATER_LIT } };
}

export interface ShaderOptions {
  fragment: string;
  uniforms: Record<string, IUniform>;
  side?: Side;
  transparent?: boolean;
  vertex?: string;
  polygonOffset?: boolean;
}

export function fogShader(
  context: PartContext,
  group: string,
  options: ShaderOptions,
): ShaderMaterial {
  const {
    fragment,
    uniforms,
    side = FrontSide,
    transparent = false,
    vertex = VERTEX,
    polygonOffset = false,
  } = options;
  return registered(
    context,
    group,
    new ShaderMaterial({
      uniforms: { ...UniformsUtils.clone(UniformsLib.fog), ...uniforms },
      vertexShader: vertex,
      fragmentShader: fragment,
      fog: true,
      transparent,
      depthWrite: !transparent,
      polygonOffset,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      side,
    }),
  );
}

export { VERTEX as BASE_VERTEX };
