import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { BAY_TONES } from '../../../theme';
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
uniform vec3 uSky;
uniform vec3 uHaze;
uniform vec3 uGround;
varying vec3 vDirection;
void main() {
  float up = normalize(vDirection).y;
  vec3 colour = mix(uHaze, uGround, smoothstep(0.0, 0.2, -up));
  colour = mix(colour, uSky, smoothstep(0.04, 0.6, up));
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

const RADIUS = 50;
const SEGMENTS = [24, 12] as const;

export function buildHaze(context: PartContext): Mesh {
  const material = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      vertexShader: HAZE_VERTEX,
      fragmentShader: HAZE_FRAGMENT,
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uSky: { value: new Color(BAY_TONES.sky) },
        uHaze: { value: new Color(BAY_TONES.haze) },
        uGround: { value: new Color(BAY_TONES.ground) },
      },
    }),
  );
  const dome = new Mesh(context.tracker.track(new SphereGeometry(RADIUS, ...SEGMENTS)), material);
  dome.name = 'haze';
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  return dome;
}
