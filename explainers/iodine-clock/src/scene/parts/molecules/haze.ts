import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three';
import type { Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { HAZE } from '../../constants';
import { registeredMaterial } from '../context';
import type { PartContext } from '../context';

const HAZE_VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = clip.xyww;
}
`;

const HAZE_FRAGMENT = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMiddle;
uniform vec3 uBottom;
uniform vec3 uRay;
varying vec3 vDirection;
float wave(vec3 d, float scale) {
  return sin(d.x * scale + sin(d.y * scale * 0.7)) * sin(d.z * scale * 1.3 + d.y * scale * 0.5);
}
void main() {
  vec3 direction = normalize(vDirection);
  float up = direction.y;
  vec3 colour = mix(uBottom, uMiddle, smoothstep(-0.7, 0.05, up));
  colour = mix(colour, uTop, smoothstep(0.05, 0.85, up));
  float cloud = 0.5 + 0.25 * wave(direction, 3.0) + 0.15 * wave(direction, 7.0);
  colour *= 0.82 + 0.3 * cloud;
  float around = atan(direction.z, direction.x);
  float rays = pow(max(0.0, sin(around * 9.0 + sin(around * 4.0) * 1.5)), 6.0);
  colour += uRay * rays * smoothstep(0.1, 0.9, up) * 0.22;
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

const SEGMENTS = [32, 16] as const;

export function buildHaze(context: PartContext, parent: Object3D): Mesh {
  const shader = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      vertexShader: HAZE_VERTEX,
      fragmentShader: HAZE_FRAGMENT,
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new Color(HAZE.top) },
        uMiddle: { value: new Color(HAZE.middle) },
        uBottom: { value: new Color(HAZE.bottom) },
        uRay: { value: new Color(HAZE.ray) },
      },
    }),
  );
  const dome = new Mesh(
    context.tracker.track(new SphereGeometry(HAZE.radius, ...SEGMENTS)),
    shader,
  );
  dome.name = 'moleculeHaze';
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  parent.add(dome);
  return dome;
}
