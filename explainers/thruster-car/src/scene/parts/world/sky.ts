import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { THEME } from '../../../theme';
import { LIGHT_RIG } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';

export const SKY = {
  widthSegments: 32,
  heightSegments: 16,
  renderOrder: -1000,
  haze: 0.012,
  zenith: 0.85,
  warmthPower: 2,
  reach: { low: [0.035, 0.1], middle: [0.16, 0.4] },
  peach: 0.45,
  away: { low: 0.5, high: 0.3 },
  glow: { elevation: 0.03, core: 500, coreStrength: 0.9, halo: 7, haloStrength: 0.55, white: 0.45 },
  clouds: {
    scale: 0.7,
    lift: 0.1,
    cover: 0.56,
    softness: 0.16,
    band: [0.03, 0.55],
    strength: 0.7,
    heading: 0.55,
    stretch: [0.3, 3.2],
    lit: 0.15,
    shade: 0.5,
    rim: { reach: 0.35, contrast: 6, white: 0.55 },
  },
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
uniform vec3 uZenith;
uniform vec3 uMiddle;
uniform vec3 uHorizon;
uniform vec3 uPeach;
uniform vec3 uAwayLow;
uniform vec3 uAwayHigh;
uniform vec3 uFog;
uniform vec3 uGlow;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uCloudRim;
uniform vec4 uReach;
uniform vec2 uRim;
uniform vec3 uSun;
uniform vec3 uBands;
uniform vec4 uGlowShape;
uniform vec4 uCloud;
uniform vec4 uCloudBand;
uniform vec2 uStretch;
varying vec3 vDirection;

const float DITHER = 1.0 / 255.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float total = 0.0;
  float weight = 0.5;
  for (int octave = 0; octave < 5; octave++) {
    total += weight * noise(p);
    p *= 2.03;
    weight *= 0.5;
  }
  return total;
}

vec3 gradient(float up, float warmth) {
  float low = mix(uReach.x, uReach.y, warmth);
  float middle = mix(uReach.z, uReach.w, warmth);
  vec3 sky = mix(mix(uAwayLow, uPeach, warmth), mix(uAwayHigh, uHorizon, warmth), smoothstep(0.0, low, up));
  sky = mix(sky, uMiddle, smoothstep(low * 0.5, middle, up));
  return mix(sky, uZenith, smoothstep(middle * 0.7, uBands.y, up));
}

float cloudShape(vec2 plane) {
  return fbm(plane * uStretch + vec2(3.1, 7.7)) * 0.7 + fbm(plane * 1.7 + vec2(11.0, 2.0)) * 0.3;
}

float glow(vec3 direction) {
  float toward = max(dot(direction, uSun), 0.0);
  return pow(toward, uGlowShape.x) * uGlowShape.y + pow(toward, uGlowShape.z) * uGlowShape.w;
}

vec3 clouds(vec3 sky, vec3 direction, float up, float warmth) {
  float band = smoothstep(uCloudBand.x, uCloudBand.x + 0.06, up)
    * (1.0 - smoothstep(uCloudBand.y * 0.6, uCloudBand.y, up));
  if (band <= 0.0) return sky;
  float c = cos(uCloudBand.w);
  float s = sin(uCloudBand.w);
  mat2 turn = mat2(c, -s, s, c);
  vec2 plane = turn * (direction.xz / (up + uCloud.y) * uCloud.x);
  float shape = cloudShape(plane);
  float cover = smoothstep(uCloud.z, uCloud.z + uCloud.w, shape);
  if (cover <= 0.0) return sky;
  float under = 1.0 - smoothstep(0.0, uCloudBand.y, up);
  vec3 cloud = mix(uCloudShade, uCloudLit, clamp(warmth * 0.8 + under * 0.3, 0.0, 1.0));
  float ahead = cloudShape(plane + turn * normalize(uSun.xz) * uRim.x);
  float rim = clamp((shape - ahead) * uRim.y, 0.0, 1.0) * warmth;
  cloud = mix(cloud, uCloudRim, rim);
  return mix(sky, cloud, cover * band * uCloudBand.z);
}

void main() {
  vec3 direction = normalize(vDirection);
  float up = max(direction.y, 0.0);
  vec2 bearing = normalize(direction.xz + vec2(1e-5));
  float warmth = pow(dot(bearing, normalize(uSun.xz)) * 0.5 + 0.5, uBands.z);
  vec3 sky = gradient(up, warmth);
  sky = mix(sky, uGlow, clamp(glow(direction), 0.0, 1.0));
  sky = clouds(sky, direction, up, warmth);
  gl_FragColor = vec4(mix(uFog, sky, smoothstep(0.0, uBands.x, direction.y)), 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) * DITHER;
}
`;

export function glowDirection(): Vector3 {
  const [x, , z] = LIGHT_RIG.key.direction;
  const across = Math.hypot(x, z);
  const { elevation } = SKY.glow;
  const flat = Math.cos(elevation) / across;
  return new Vector3(x * flat, Math.sin(elevation), z * flat);
}

export function skyUniforms() {
  const { glow, clouds, reach, away } = SKY;
  const white = new Color(1, 1, 1);
  const horizon = new Color(THEME.skyHorizon);
  const shade = new Color(THEME.skyMiddle).lerp(new Color(THEME.skyZenith), clouds.shade);
  return {
    uZenith: { value: new Color(THEME.skyZenith) },
    uMiddle: { value: new Color(THEME.skyMiddle) },
    uHorizon: { value: horizon },
    uPeach: { value: horizon.clone().lerp(white, SKY.peach) },
    uAwayLow: { value: new Color(THEME.fog).lerp(horizon, away.low) },
    uAwayHigh: { value: new Color(THEME.skyMiddle).lerp(horizon, away.high) },
    uReach: { value: new Vector4(...reach.low, ...reach.middle) },
    uRim: { value: new Vector2(clouds.rim.reach, clouds.rim.contrast) },
    uCloudRim: { value: new Color(THEME.keyLight).lerp(white, clouds.rim.white) },
    uFog: { value: new Color(THEME.fog) },
    uGlow: { value: new Color(THEME.keyLight).lerp(white, glow.white) },
    uCloudLit: { value: new Color(THEME.keyLight).lerp(white, clouds.lit) },
    uCloudShade: { value: shade },
    uSun: { value: glowDirection() },
    uBands: { value: new Vector3(SKY.haze, SKY.zenith, SKY.warmthPower) },
    uGlowShape: {
      value: new Vector4(glow.core, glow.coreStrength, glow.halo, glow.haloStrength),
    },
    uCloud: { value: new Vector4(clouds.scale, clouds.lift, clouds.cover, clouds.softness) },
    uCloudBand: {
      value: new Vector4(clouds.band[0], clouds.band[1], clouds.strength, clouds.heading),
    },
    uStretch: { value: new Vector2(...clouds.stretch) },
  };
}

export function createSky(context: PartContext): Mesh {
  const material = registered(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      uniforms: skyUniforms(),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }),
  );
  const geometry = context.tracker.track(
    new SphereGeometry(1, SKY.widthSegments, SKY.heightSegments),
  );
  const dome = new Mesh(geometry, material);
  dome.name = 'sky';
  dome.frustumCulled = false;
  dome.renderOrder = SKY.renderOrder;
  return dome;
}
