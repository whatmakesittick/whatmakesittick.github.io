import { Mesh, PlaneGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { SEA_START_Z_M, WALL } from '../../../model/layout';
import { BEACH_TOP_M, GROUND_EXTENT_M, LAYER, SEA_LEVEL_M } from '../../constants';
import { backdropMaterial, colour } from './atmosphere';
import type { Backdrop } from './atmosphere';
import { LONG_SEGMENTS, denseNearOrigin } from './spacing';
import { ATMOSPHERE_GLSL, LIGHT_GLSL, NOISE_GLSL, OUTPUT_GLSL, WORLD_VERTEX } from './glsl';

const BEACH = {
  topZ: WALL.zM - WALL.thicknessM / 2,
  bottomZ: SEA_START_Z_M - 3,
  sand: '#ab9f8b',
  wetSand: '#9c8466',
  pebbles: '#a69a8a',
} as const;

const FRAGMENT = /* glsl */ `
${NOISE_GLSL}
${ATMOSPHERE_GLSL}
${LIGHT_GLSL}
uniform float uScroll;
uniform float uSeaLevel;
uniform vec3 uSand;
uniform vec3 uWetSand;
uniform vec3 uPebbles;
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  float u = roadU(vWorld.x, uScroll);
  float ripple = cellNoise(vec2(u * 0.9, vWorld.z * 5.0), WRAP * 0.9);
  float fine = cellNoise(vec2(u * 12.0, vWorld.z * 12.0), WRAP * 12.0);
  vec3 albedo = uSand * (0.88 + ripple * 0.12 + fine * 0.1);
  float wrack = smoothstep(0.62, 0.8, cellNoise(vec2(u * 0.3, vWorld.z * 1.5), WRAP * 0.3));
  albedo = mix(albedo, uPebbles, wrack * smoothstep(0.6, 0.3, vWorld.y - uSeaLevel) * 0.5);
  float above = vWorld.y - uSeaLevel;
  float wet = 1.0 - smoothstep(0.04, 0.22, above + (ripple - 0.5) * 0.06);
  albedo = mix(albedo, uWetSand, wet);
  vec3 normal = normalize(vNormal);
  vec3 colour = lit(albedo, normal, 1.0);
  vec3 view = normalize(vWorld - cameraPosition);
  colour += uSunLight * pow(max(dot(reflect(view, normal), uSunDir), 0.0), 40.0) * wet * 0.4;
  gl_FragColor = vec4(hazed(colour, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

function slope(): BufferGeometry {
  const bottomY =
    BEACH_TOP_M +
    ((SEA_LEVEL_M - BEACH_TOP_M) * (BEACH.bottomZ - BEACH.topZ)) / (SEA_START_Z_M - BEACH.topZ);
  const width = GROUND_EXTENT_M * 2;
  const depth = Math.hypot(BEACH.bottomZ - BEACH.topZ, bottomY - BEACH_TOP_M);
  const tilt = Math.atan2(BEACH_TOP_M - bottomY, BEACH.topZ - BEACH.bottomZ);
  const plane = new PlaneGeometry(width, depth, LONG_SEGMENTS, 1)
    .rotateX(-Math.PI / 2 - tilt)
    .translate(0, (BEACH_TOP_M + bottomY) / 2, (BEACH.topZ + BEACH.bottomZ) / 2);
  return denseNearOrigin(plane, 'x', GROUND_EXTENT_M);
}

export function buildBeach(backdrop: Backdrop): Mesh {
  const material = backdropMaterial(
    backdrop,
    {
      uSeaLevel: { value: SEA_LEVEL_M },
      uSand: colour(BEACH.sand, 0.65),
      uWetSand: colour(BEACH.wetSand, 0.8),
      uPebbles: colour(BEACH.pebbles, 0.8),
    },
    { vertexShader: WORLD_VERTEX, fragmentShader: FRAGMENT },
  );
  const beach = new Mesh(backdrop.context.tracker.track(slope()), material);
  beach.name = 'beach';
  beach.renderOrder = LAYER.ground;
  return beach;
}
