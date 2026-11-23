import { Mesh, PlaneGeometry } from 'three';
import { SEA_START_Z_M } from '../../../model/layout';
import { THEME } from '../../../theme';
import { GROUND_EXTENT_M, LAYER, SEA_LEVEL_M } from '../../constants';
import { backdropMaterial, colour } from './atmosphere';
import type { Backdrop } from './atmosphere';
import { ATMOSPHERE_GLSL, NOISE_GLSL, OUTPUT_GLSL } from './glsl';

const SEA = { nearZ: SEA_START_Z_M + 1.5, farZ: -GROUND_EXTENT_M } as const;
const WATER = {
  deep: { color: '#163f52', intensity: 0.55 },
  shallow: { color: THEME.sea, intensity: 0.7 },
  surf: { color: '#7fb9b4', intensity: 0.9 },
  foam: { color: '#fff6e6', intensity: 1.3 },
  glitter: { color: THEME.seaGlitter, intensity: 1 },
} as const;

const VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
${NOISE_GLSL}
${ATMOSPHERE_GLSL}
uniform float uScroll;
uniform float uShoreZ;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSurf;
uniform vec3 uFoam;
uniform vec3 uGlitter;
varying vec3 vWorld;

const vec4 WAVES[4] = vec4[4](
  vec4(60.0, 0.42, 110.0, 0.05),
  vec4(190.0, 0.27, 90.0, 0.035),
  vec4(-410.0, 0.95, 230.0, 0.022),
  vec4(730.0, -1.6, 320.0, 0.014)
);

vec2 slope(float u, float z, float fade) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 w = WAVES[i];
    float kx = TAU * w.x / WRAP;
    float phase = kx * u + w.y * z + TAU * w.z * uScroll / WRAP;
    vec2 k = vec2(kx, w.y);
    g += w.w * cos(phase) * k / length(k) * (i < 2 ? 1.0 : fade);
  }
  return g;
}

void main() {
  vec3 ray = vWorld - cameraPosition;
  float dist = length(ray);
  vec3 view = ray / dist;
  float u = roadU(vWorld.x, uScroll);
  float fade = 1.0 / (1.0 + dist * 0.01);
  vec2 g = slope(u, vWorld.z, fade) * (0.35 + 0.65 / (1.0 + dist * 0.002));
  vec3 normal = normalize(vec3(-g.x, 1.0, -g.y));
  float facing = max(dot(normal, -view), 0.0);
  float fresnel = 0.02 + 0.4 * pow(1.0 - facing, 5.0);
  vec3 reflected = reflect(view, normal);
  vec3 sky = skyAt(normalize(vec3(reflected.x, max(reflected.y, 0.0) + 0.12, reflected.z)));
  float shore = max(uShoreZ - vWorld.z, 0.0);
  float shallow = exp(-shore / 9.0);
  vec3 body = mix(uDeep, uShallow, 0.25 + shallow * 0.6);
  body = mix(body, uSurf, exp(-shore / 2.5) * 0.6);
  vec3 colour = mix(body, sky, fresnel);

  vec3 halfway = normalize(uSunDir - view);
  float slope2 = dot(halfway.xz, halfway.xz) / max(halfway.y * halfway.y, 1e-4);
  float chance = exp(-slope2 / (2.0 * 0.13 * 0.13));
  float glow = exp(-slope2 / (2.0 * 0.05 * 0.05));
  vec2 sunFlat = normalize(uSunDir.xz);
  vec2 q = vec2(dot(vec2(u, vWorld.z), sunFlat), dot(vec2(u, vWorld.z), vec2(-sunFlat.y, sunFlat.x)));
  q.x += uScroll * 0.02;
  vec2 cellCoord = q * vec2(4.0, 1.1);
  vec2 cell = floor(cellCoord);
  vec2 inside = fract(cellCoord) - 0.5;
  float pick = hash12(cell + 17.0);
  float dash = smoothstep(0.5, 0.15, length(inside * vec2(2.4, 1.0)));
  float sparkle = step(1.0 - chance * 0.55, pick) * dash;
  float coarse = smoothstep(0.35, 1.2, fwidth(cellCoord.x) + fwidth(cellCoord.y) * 0.5);
  sparkle = mix(sparkle, chance * 0.12, coarse);
  colour += uGlitter * (glow * 1.6 + chance * 0.25 + sparkle * 9.0);

  float swash = 0.9 + 0.55 * sin(TAU * (37.0 * u + 140.0 * uScroll) / WRAP + vWorld.z * 0.4);
  float foamNoise = cellNoise(vec2(u * 1.3, vWorld.z * 2.0), WRAP * 1.3);
  float foam = smoothstep(0.35, 0.0, abs(shore - swash)) * smoothstep(0.25, 0.75, foamNoise);
  foam = max(foam, smoothstep(0.45, 0.0, shore) * 0.9);
  colour = mix(colour, uFoam * (0.6 + 0.4 * max(dot(vec3(0.0, 1.0, 0.0), uSunDir) + 0.6, 0.0)), foam * 0.85);

  gl_FragColor = vec4(mix(colour, horizonAt(ray), hazeAt(dist)), 1.0);
  ${OUTPUT_GLSL}
}
`;

export function buildSea(backdrop: Backdrop): Mesh {
  const depth = SEA.nearZ - SEA.farZ;
  const geometry = new PlaneGeometry(GROUND_EXTENT_M * 2, depth)
    .rotateX(-Math.PI / 2)
    .translate(0, SEA_LEVEL_M, SEA.nearZ - depth / 2);
  const material = backdropMaterial(
    backdrop,
    {
      uShoreZ: { value: SEA_START_Z_M },
      uDeep: colour(WATER.deep.color, WATER.deep.intensity),
      uShallow: colour(WATER.shallow.color, WATER.shallow.intensity),
      uSurf: colour(WATER.surf.color, WATER.surf.intensity),
      uFoam: colour(WATER.foam.color, WATER.foam.intensity),
      uGlitter: colour(WATER.glitter.color, WATER.glitter.intensity),
    },
    { vertexShader: VERTEX, fragmentShader: FRAGMENT },
  );
  const sea = new Mesh(backdrop.context.tracker.track(geometry), material);
  sea.name = 'sea';
  sea.renderOrder = LAYER.ground;
  return sea;
}
