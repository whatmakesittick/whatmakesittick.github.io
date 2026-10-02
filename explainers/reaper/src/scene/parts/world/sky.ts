import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { Camera } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { HAZE, SKY } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';

const VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uRose;
uniform vec3 uHorizon;
uniform vec3 uAntiHorizon;
uniform vec3 uGlow;
uniform vec3 uHaze;
uniform vec3 uRidgeNear;
uniform vec3 uRidgeFar;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uStar;
uniform vec3 uSun;
uniform vec3 uHeights;
uniform vec4 uGlowShape;
uniform vec4 uRidge;
uniform vec4 uClouds;
uniform vec3 uCloudShape;
uniform vec3 uStars;
varying vec3 vDirection;

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

float ridgeLine(vec2 around, float base, float range, float seed) {
  float peaks = 0.0;
  float weight = 0.55;
  float scale = 2.2;
  for (int octave = 0; octave < 4; octave++) {
    float n = noise(around * scale + seed);
    peaks += weight * (1.0 - abs(n * 2.0 - 1.0));
    scale *= 2.3;
    weight *= 0.5;
  }
  float mask = smoothstep(0.3, 0.65, noise(around * 1.3 + seed * 3.1));
  return base + range * (peaks - 0.45) * mask;
}

void main() {
  vec3 direction = normalize(vDirection);
  float height = direction.y;
  vec2 flat2 = normalize(direction.xz + vec2(1e-5));
  float facing = dot(flat2, normalize(uSun.xz));
  float sunward = 0.5 + 0.5 * facing;
  float near = max(dot(direction, uSun), 0.0);

  vec3 horizon = mix(uAntiHorizon, uHorizon, smoothstep(0.1, 0.9, sunward));
  float up = max(height, 0.0);
  vec3 sky = mix(uHaze, horizon, smoothstep(0.0, uHeights.x, up));
  sky = mix(sky, mix(uRose, uHorizon * 0.8, sunward * 0.35), smoothstep(uHeights.x, uHeights.y, up));
  sky = mix(sky, uUpper, smoothstep(uHeights.y * 0.6, uHeights.z, up));
  sky = mix(sky, uZenith, smoothstep(uHeights.z * 0.8, 1.0, up));
  sky += uGlow * (pow(near, uGlowShape.x) * uGlowShape.z + pow(near, uGlowShape.y) * uGlowShape.w * exp(-up * 6.0));

  vec2 cloudPlane = direction.xz / (height + 0.12) * uClouds.z;
  vec2 streak = vec2(cloudPlane.x + cloudPlane.y * 0.4, (cloudPlane.y - cloudPlane.x * 0.3) * uClouds.w);
  float cloud = fbm(streak + vec2(3.7, 1.3));
  float cover = smoothstep(uClouds.x, uClouds.x + uClouds.y, cloud);
  cover *= smoothstep(uCloudShape.x, uCloudShape.x + 0.06, up) * (1.0 - smoothstep(uCloudShape.y * 0.6, uCloudShape.y, up));
  vec3 cloudColour = mix(uCloudShade, uCloudLit, clamp(sunward * 1.1 + near * 0.4 - 0.15, 0.0, 1.0));
  sky = mix(sky, cloudColour, cover * uCloudShape.z);

  vec2 cell = floor(direction.xz / (height + 0.02) * 240.0);
  float star = step(uStars.y, hash(cell)) * smoothstep(uStars.x, uStars.x + 0.2, up);
  sky += uStar * star * uStars.z * (1.0 - sunward * 0.7);

  float farRidge = ridgeLine(flat2, uRidge.z, uRidge.w, 11.0);
  float nearRidge = ridgeLine(flat2, uRidge.x, uRidge.y, 3.0);
  vec3 farColour = mix(uRidgeFar, uHaze, 0.25 + 0.35 * sunward);
  vec3 nearColour = mix(uRidgeNear, uHaze, 0.12 + 0.3 * sunward);
  sky = mix(sky, farColour, smoothstep(farRidge + 0.0008, farRidge - 0.0008, height) * step(-0.002, height));
  sky = mix(sky, nearColour, smoothstep(nearRidge + 0.0008, nearRidge - 0.0008, height) * step(-0.002, height));
  vec3 colour = mix(uHaze, sky, smoothstep(-0.006, -0.001, height));
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

function colour(value: string): Color {
  return new Color(value);
}

export function skyUniforms() {
  const { colours, heights, glow, ridge, clouds, stars } = SKY;
  return {
    uZenith: { value: colour(colours.zenith) },
    uUpper: { value: colour(colours.upper) },
    uRose: { value: colour(colours.rose) },
    uHorizon: { value: colour(colours.horizon) },
    uAntiHorizon: { value: colour(colours.antiHorizon) },
    uGlow: { value: colour(colours.glow) },
    uHaze: { value: colour(HAZE.colour) },
    uRidgeNear: { value: colour(colours.ridgeNear) },
    uRidgeFar: { value: colour(colours.ridgeFar) },
    uCloudLit: { value: colour(colours.cloudLit) },
    uCloudShade: { value: colour(colours.cloudShade) },
    uStar: { value: colour(colours.star) },
    uSun: { value: new Vector3(...SKY.sunDirection).normalize() },
    uHeights: { value: new Vector3(heights.band, heights.rose, heights.upper) },
    uGlowShape: { value: [glow.tight, glow.broad, glow.tightGain, glow.broadGain] },
    uRidge: { value: [ridge.near, ridge.nearRange, ridge.far, ridge.farRange] },
    uClouds: { value: [clouds.cover, clouds.sharpness, clouds.scale, clouds.stretch] },
    uCloudShape: { value: new Vector3(clouds.from, clouds.to, clouds.opacity) },
    uStars: { value: new Vector3(stars.from, stars.density, stars.gain) },
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
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const geometry = context.tracker.track(
    new SphereGeometry(SKY.radius, SKY.widthSegments, SKY.heightSegments),
  );
  const dome = new Mesh(geometry, material);
  dome.frustumCulled = false;
  dome.renderOrder = SKY.renderOrder;
  dome.onBeforeRender = (_renderer, _scene, camera: Camera) => {
    dome.position.copy(camera.position);
    dome.parent?.worldToLocal(dome.position);
    dome.updateMatrixWorld();
  };
  return dome;
}
