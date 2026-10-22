import {
  BackSide,
  Color,
  Fog,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type { Object3D } from 'three';
import { HAZE, SKY, SUN_DIRECTION } from '../../constants';
import { LINE_GROUP, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { SKY_DOME } from './constants';
import { SKYLINE_GLSL, skylineUniforms } from './skyline';

const VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = clip.xyww;
}
`;

const FRAGMENT = /* glsl */ `
${SKYLINE_GLSL}
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uGlow;
uniform vec3 uSun;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec4 uShape;
uniform vec4 uGlowShape;
uniform vec4 uCloud;
uniform vec4 uCloudBand;
uniform vec2 uStretch;
uniform vec2 uWarmth;
varying vec3 vDirection;

const float DITHER = 1.0 / 255.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
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
  float rise = 1.0 - exp(-up * uShape.x);
  vec3 sky = mix(uHorizon, uTop, rise);
  float haze = (1.0 - smoothstep(0.0, uShape.z, up)) * uShape.w * (0.6 + 0.4 * warmth);
  return mix(sky, uHaze, haze);
}

float glow(vec3 direction) {
  float toward = max(dot(direction, uSun), 0.0);
  return pow(toward, uGlowShape.y) * uGlowShape.x + pow(toward, uGlowShape.w) * uGlowShape.z;
}

vec3 clouds(vec3 sky, vec3 direction, float up, float warmth) {
  float band = smoothstep(uCloudBand.x, uCloudBand.x + 0.08, up)
    * (1.0 - smoothstep(uCloudBand.y * 0.6, uCloudBand.y, up));
  if (band <= 0.0) return sky;
  float c = cos(uCloudBand.w);
  float s = sin(uCloudBand.w);
  vec2 plane = mat2(c, -s, s, c) * (direction.xz / (up + uCloud.y) * uCloud.x);
  float shape = fbm(plane * uStretch + vec2(3.1, 7.7)) * 0.75 + fbm(plane * 1.9 + 11.0) * 0.25;
  float cover = smoothstep(uCloud.z, uCloud.z + uCloud.w, shape);
  vec3 cloud = mix(uCloudShade, uCloudLit, clamp(warmth * 0.7 + shape * 0.3, 0.0, 1.0));
  return mix(sky, cloud, cover * band * uCloudBand.z);
}

void main() {
  vec3 direction = normalize(vDirection);
  float up = max(direction.y, 0.0);
  vec2 bearing = normalize(direction.xz + vec2(1e-5));
  float warmth = pow(max(dot(bearing, normalize(uSun.xz)), 0.0), uWarmth.y);
  vec3 sky = gradient(up, warmth);
  sky = mix(sky, uGlow, warmth * uWarmth.x * (1.0 - smoothstep(0.0, uShape.z * 2.0, up)));
  sky = clouds(sky, direction, up, warmth);
  sky = mix(sky, uGlow, clamp(glow(direction), 0.0, 1.0));
  sky = mix(uHorizon, sky, smoothstep(-uShape.y, uShape.y, direction.y));
  sky = skyline(sky, direction);
  gl_FragColor = vec4(sky, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) * DITHER;
}
`;

function skyUniforms() {
  const { rise, band, haze, glow, horizonWarmth, clouds } = SKY_DOME;
  return {
    uTop: { value: new Color(SKY.top) },
    uHorizon: { value: new Color(HAZE.colour) },
    uHaze: { value: new Color(haze.colour) },
    uGlow: { value: new Color(glow.colour) },
    uSun: { value: new Vector3(...SUN_DIRECTION).normalize() },
    uCloudLit: { value: new Color(clouds.lit) },
    uCloudShade: { value: new Color(clouds.shade) },
    uShape: { value: new Vector4(rise, band, haze.height, haze.strength) },
    uGlowShape: {
      value: new Vector4(glow.wide, glow.wideTightness, glow.core, glow.coreTightness),
    },
    uCloud: { value: new Vector4(clouds.scale, clouds.lift, clouds.cover, clouds.softness) },
    uCloudBand: {
      value: new Vector4(clouds.band[0], clouds.band[1], clouds.strength, clouds.heading),
    },
    uStretch: { value: new Vector2(...clouds.stretch) },
    uWarmth: { value: new Vector2(horizonWarmth.strength, horizonWarmth.tightness) },
    ...skylineUniforms(),
  };
}

function skyMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: skyUniforms(),
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
}

const followFog: Object3D['onBeforeRender'] = (_renderer, scene, _camera, _geometry, material) => {
  if (!(scene.fog instanceof Fog) || !(material instanceof ShaderMaterial)) return;
  material.uniforms.uHorizon.value.copy(scene.fog.color);
};

export function skyDome(context: PartContext): Mesh {
  const geometry = context.tracker.track(
    new SphereGeometry(1, SKY_DOME.widthSegments, SKY_DOME.heightSegments),
  );
  const dome = new Mesh(geometry, registeredMaterial(context, LINE_GROUP, skyMaterial()));
  dome.onBeforeRender = followFog;
  dome.name = 'sky';
  dome.frustumCulled = false;
  dome.renderOrder = SKY_DOME.renderOrder;
  return dome;
}
