import { BackSide, Mesh, SphereGeometry, Vector2 } from 'three';
import { LAYER } from '../../constants';
import { backdropMaterial, colour } from './atmosphere';
import type { Backdrop } from './atmosphere';
import { ATMOSPHERE_GLSL, NOISE_GLSL, OUTPUT_GLSL } from './glsl';

const SEGMENTS = { width: 48, height: 24 } as const;
const SUN_RADIUS_RAD = 0.0125;
const SUN_EDGE = { inner: 0.75, outer: 1.2 } as const;
const SUN_CORE = { color: '#fff1d2', intensity: 9 } as const;
const CLOUD = {
  lit: { color: '#ffd9b0', intensity: 1.15 },
  shade: { color: '#a99cae', intensity: 0.9 },
} as const;

const VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = clip.xyww;
}
`;

const FRAGMENT = /* glsl */ `
${NOISE_GLSL}
${ATMOSPHERE_GLSL}
uniform float uScroll;
uniform vec3 uSunCore;
uniform vec2 uSunSize;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
varying vec3 vDirection;

const float CLOUD_PERIOD = 64.0;

float streaks(vec3 dir) {
  float up = max(dir.y, 0.0);
  vec2 plane = dir.xz / (up + 0.035);
  float drift = uScroll / WRAP * CLOUD_PERIOD;
  vec2 p = vec2(plane.x * 0.22 + drift, plane.y * 2.4);
  float n = cellNoise(p, CLOUD_PERIOD) * 0.65 + cellNoise(p * vec2(2.25, 3.1) + 7.0, CLOUD_PERIOD * 2.25) * 0.35;
  float band = smoothstep(0.52, 0.86, n);
  float height = smoothstep(0.015, 0.06, up) * (1.0 - smoothstep(0.16, 0.42, up));
  return band * height;
}

void main() {
  vec3 dir = normalize(vDirection);
  vec3 sky = skyAt(vec3(dir.x, max(dir.y, 0.0), dir.z));
  float cover = streaks(dir);
  vec2 bearing = normalize(dir.xz + vec2(1e-5));
  float sunward = dot(bearing, normalize(uSunDir.xz)) * 0.5 + 0.5;
  float toward = max(dot(dir, uSunDir), 0.0);
  vec3 cloud = mix(uCloudShade, uCloudLit, pow(sunward, 3.0)) + uSunGlow * pow(toward, 30.0) * 1.5;
  sky = mix(sky, cloud, cover * 0.75);
  float angle = sqrt(max(2.0 * (1.0 - dot(dir, uSunDir)), 0.0));
  float disc = 1.0 - smoothstep(uSunSize.x, uSunSize.y, angle);
  sky = mix(sky, uSunCore, disc * (1.0 - cover * 0.6));
  gl_FragColor = vec4(sky, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function buildSky(backdrop: Backdrop): Mesh {
  const geometry = backdrop.context.tracker.track(
    new SphereGeometry(1, SEGMENTS.width, SEGMENTS.height),
  );
  const material = backdropMaterial(
    backdrop,
    {
      uSunCore: colour(SUN_CORE.color, SUN_CORE.intensity),
      uSunSize: {
        value: new Vector2(SUN_RADIUS_RAD * SUN_EDGE.inner, SUN_RADIUS_RAD * SUN_EDGE.outer),
      },
      uCloudLit: colour(CLOUD.lit.color, CLOUD.lit.intensity),
      uCloudShade: colour(CLOUD.shade.color, CLOUD.shade.intensity),
    },
    { vertexShader: VERTEX, fragmentShader: FRAGMENT, side: BackSide, depthWrite: false },
  );
  const dome = new Mesh(geometry, material);
  dome.name = 'sky';
  dome.frustumCulled = false;
  dome.renderOrder = LAYER.sky;
  return dome;
}
