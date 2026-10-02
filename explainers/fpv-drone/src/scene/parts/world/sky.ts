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
import type { Camera } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { THEME } from '../../../theme';
import { SKY } from '../../constants';
import { FPV_LIGHT } from '../../lighting';
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
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec2 uGradient;
uniform vec4 uCloud;
uniform vec3 uCloudBand;
uniform vec2 uShading;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uSun;
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
    p *= 2.07;
    weight *= 0.5;
  }
  return total;
}

vec3 clouds(vec3 sky, float up, vec3 direction) {
  float band = smoothstep(uCloudBand.x, uCloudBand.x + 0.08, up)
    * (1.0 - smoothstep(uCloudBand.y * 0.7, uCloudBand.y, up));
  if (band <= 0.0) return sky;
  vec2 plane = direction.xz / (up + uCloud.w) * uCloud.x + vec2(2.3, 7.1);
  float shape = fbm(plane);
  float cover = smoothstep(uCloud.y, uCloud.y + uCloud.z, shape);
  if (cover <= 0.0) return sky;
  float towardSun = fbm(plane + normalize(uSun.xz) * uShading.x);
  float lit = clamp(0.5 + (shape - towardSun) * uShading.y, 0.0, 1.0);
  vec3 cloud = mix(uShade, uLit, mix(lit, 1.0, 1.0 - cover));
  return mix(sky, cloud, cover * band * uCloudBand.z);
}

void main() {
  vec3 direction = normalize(vDirection);
  float up = max(direction.y, 0.0);
  vec3 sky = mix(uHorizon, uTop, 1.0 - exp(-up * uGradient.x));
  sky = clouds(sky, up, direction);
  sky = mix(uHorizon, sky, smoothstep(0.0, uGradient.y, up));
  vec3 colour = mix(uHorizon, sky, smoothstep(-0.01, 0.0, direction.y));
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

export function skyUniforms() {
  const { cloud, rise, haze } = SKY;
  return {
    uTop: { value: new Color(THEME.skyTop) },
    uHorizon: { value: new Color(THEME.skyHorizon) },
    uGradient: { value: new Vector2(rise, haze) },
    uCloud: { value: new Vector4(cloud.scale, cloud.cover, cloud.softness, cloud.lift) },
    uCloudBand: { value: new Vector3(cloud.band.from, cloud.band.to, cloud.strength) },
    uShading: { value: new Vector2(cloud.shading.reach, cloud.shading.contrast) },
    uLit: { value: new Color(cloud.lit) },
    uShade: { value: new Color(cloud.shade) },
    uSun: { value: new Vector3(...FPV_LIGHT.key.position).normalize() },
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
