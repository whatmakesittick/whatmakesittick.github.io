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
import { HAZE, SKY, SUN_DIRECTION } from '../../constants';
import { registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { SKY_DOME } from './constants';

const VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = clip.xyww;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uSun;
uniform vec2 uRise;
uniform vec3 uWide;
uniform vec3 uCore;
uniform vec3 uGround;
uniform vec4 uFloor;
varying vec3 vDirection;

vec3 groundBelow(vec3 direction) {
  float down = max(-direction.y, 1e-5);
  float reach = max(cameraPosition.y, uFloor.z) / down;
  float haze = max(smoothstep(uFloor.x, uFloor.y, reach), 1.0 - smoothstep(0.0, uFloor.w, down));
  return mix(uGround, uHorizon, haze);
}

void main() {
  vec3 direction = normalize(vDirection);
  float up = max(direction.y, 0.0);
  float lift = smoothstep(0.0, uRise.y, up);
  float rise = (1.0 - exp(-up * uRise.x)) * lift;
  vec3 sky = direction.y >= 0.0 ? mix(uHorizon, uTop, rise) : groundBelow(direction);
  float towardSun = max(dot(direction, uSun), 0.0);
  vec2 bearing = normalize(direction.xz + vec2(1e-5));
  float sunward = max(dot(bearing, normalize(uSun.xz)), 0.0);
  float glow = pow(towardSun, uWide.y) * uWide.x
    + pow(sunward, uWide.z) * uCore.z * lift * (1.0 - rise)
    + pow(towardSun, uCore.y) * uCore.x;
  float above = smoothstep(-uRise.y, uRise.y, direction.y);
  sky = mix(sky, uGlow, clamp(glow, 0.0, 1.0) * above);
  gl_FragColor = vec4(sky, 1.0);
  #include <colorspace_fragment>
}
`;

function skyMaterial(): ShaderMaterial {
  const { rise, band, glow, ground } = SKY_DOME;
  return new ShaderMaterial({
    uniforms: {
      uTop: { value: new Color(SKY.top) },
      uHorizon: { value: new Color(HAZE.colour) },
      uGlow: { value: new Color(glow.colour) },
      uSun: { value: new Vector3(...SUN_DIRECTION).normalize() },
      uRise: { value: new Vector2(rise, band) },
      uWide: { value: new Vector3(glow.wide, glow.wideTightness, glow.horizonTightness) },
      uCore: { value: new Vector3(glow.core, glow.coreTightness, glow.horizon) },
      uGround: { value: new Color(ground.colour) },
      uFloor: { value: new Vector4(HAZE.near, HAZE.far, ground.minHeight, ground.band) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
}

export function skyDome(context: PartContext, name: string): Mesh {
  const geometry = context.tracker.track(
    new SphereGeometry(1, SKY_DOME.widthSegments, SKY_DOME.heightSegments),
  );
  const dome = new Mesh(geometry, registeredMaterial(context, UNDIMMED_GROUP, skyMaterial()));
  dome.name = name;
  dome.frustumCulled = false;
  dome.renderOrder = SKY_DOME.renderOrder;
  return dome;
}
