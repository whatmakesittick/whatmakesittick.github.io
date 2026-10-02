import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3, Vector4 } from 'three';
import type { Camera } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { THEME } from '../../../theme';
import { SKY } from '../../constants';
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
uniform vec4 uCloud;
uniform vec3 uCloudBand;
uniform float uBlend;
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

void main() {
  vec3 direction = normalize(vDirection);
  float up = max(direction.y, 0.0);
  vec3 sky = mix(uHorizon, uTop, smoothstep(0.0, uBlend, up));
  vec2 plane = direction.xz / (up + uCloud.w) * uCloud.x;
  float cloud = fbm(plane + vec2(2.3, 7.1));
  float cover = smoothstep(uCloud.y, uCloud.y + uCloud.z, cloud);
  float band = smoothstep(uCloudBand.x, uCloudBand.x + 0.08, up) * (1.0 - smoothstep(uCloudBand.y * 0.7, uCloudBand.y, up));
  vec3 lit = mix(sky, uHorizon, 0.55);
  vec3 shade = mix(sky, uTop, 0.35);
  sky = mix(sky, mix(shade, lit, cover), band * uCloudBand.z);
  vec3 colour = mix(uHorizon, sky, smoothstep(-0.01, 0.0, direction.y));
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

export function skyUniforms() {
  const { cloud, blend } = SKY;
  return {
    uTop: { value: new Color(THEME.skyTop) },
    uHorizon: { value: new Color(THEME.skyHorizon) },
    uCloud: { value: new Vector4(cloud.scale, cloud.cover, cloud.softness, cloud.lift) },
    uCloudBand: { value: new Vector3(cloud.from, cloud.to, 0.9) },
    uBlend: { value: blend },
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
