import { Color, DoubleSide, ShaderMaterial, Vector2, Vector3 } from 'three';
import { TURBINE_GEOMETRY } from '../../../model/layout';
import { FLOW_LOOK, STREAMLINES } from './constants';

const VERTEX = /* glsl */ `
attribute vec3 aTangent;
attribute float aSide;
attribute float aTravel;
attribute float aShare;
uniform float uMinWidth;
uniform float uWidthPerMetre;
uniform vec3 uHub;
uniform vec2 uFacing;
uniform vec2 uNear;
varying float vSide;
varying float vTravel;
varying float vShare;
varying float vSight;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 tangent = normalize(mat3(modelMatrix) * aTangent);
  vec3 toEye = cameraPosition - world.xyz;
  vec3 across = cross(tangent, toEye);
  float span = length(across);
  vec3 side = span > 1e-4 ? across / span : vec3(0.0, 1.0, 0.0);
  float eye = length(toEye);
  float focus = length(cameraPosition - (modelMatrix * vec4(uHub, 1.0)).xyz);
  float facing = smoothstep(uFacing.x, uFacing.y, span / max(eye, 1e-4));
  vSight = facing * smoothstep(uNear.x * focus, uNear.y * focus, eye);
  float width = max(uMinWidth, eye * uWidthPerMetre);
  world.xyz += side * aSide * width * 0.5;
  vSide = aSide;
  vTravel = aTravel;
  vShare = aShare;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uLine;
uniform vec3 uDash;
uniform float uClock;
uniform float uPeriod;
uniform float uDashShare;
uniform float uDashOpacity;
uniform float uLineOpacity;
uniform vec2 uFade;
varying float vSide;
varying float vTravel;
varying float vShare;
varying float vSight;
void main() {
  float core = 1.0 - vSide * vSide;
  float phase = fract((vTravel - uClock) / uPeriod);
  float rise = smoothstep(1.0 - uDashShare, 1.0, phase);
  float dash = rise * rise * (1.0 - smoothstep(0.97, 1.0, phase));
  float ends = smoothstep(0.0, uFade.x, vShare) * (1.0 - smoothstep(uFade.y, 1.0, vShare));
  float line = uLineOpacity * core * core * core;
  float alpha = ends * vSight * clamp(line + dash * core * uDashOpacity, 0.0, 1.0);
  gl_FragColor = vec4(mix(uLine, uDash, dash), alpha);
  #include <colorspace_fragment>
}
`;

export function flowMaterial(): ShaderMaterial {
  const { dashPeriod, dashShare, dashOpacity, lineOpacity, fade, facing, near } = STREAMLINES;
  const { minWidth, widthPerMetre } = STREAMLINES;
  return new ShaderMaterial({
    uniforms: {
      uLine: { value: new Color(FLOW_LOOK.line) },
      uDash: { value: new Color(FLOW_LOOK.dash) },
      uClock: { value: 0 },
      uPeriod: { value: dashPeriod },
      uDashShare: { value: dashShare },
      uDashOpacity: { value: dashOpacity },
      uLineOpacity: { value: lineOpacity },
      uFade: { value: new Vector2(...fade) },
      uFacing: { value: new Vector2(...facing) },
      uNear: { value: new Vector2(...near) },
      uHub: { value: new Vector3(...TURBINE_GEOMETRY.hub) },
      uMinWidth: { value: minWidth },
      uWidthPerMetre: { value: widthPerMetre },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}
