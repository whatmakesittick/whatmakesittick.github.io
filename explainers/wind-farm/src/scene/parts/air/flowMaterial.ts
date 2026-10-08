import { Color, DoubleSide, ShaderMaterial, Vector2 } from 'three';
import { FLOW_LOOK, STREAMLINES } from './constants';

const VERTEX = /* glsl */ `
attribute vec3 aTangent;
attribute float aSide;
attribute float aTravel;
attribute float aShare;
uniform float uMinWidth;
uniform float uWidthPerMetre;
varying float vSide;
varying float vTravel;
varying float vShare;
varying float vFacing;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 tangent = normalize(mat3(modelMatrix) * aTangent);
  vec3 toEye = cameraPosition - world.xyz;
  vec3 across = cross(tangent, toEye);
  float span = length(across);
  vec3 side = span > 1e-4 ? across / span : vec3(0.0, 1.0, 0.0);
  float eye = length(toEye);
  vFacing = span / max(eye, 1e-4);
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
uniform float uLineOpacity;
uniform vec2 uFade;
uniform vec2 uFacing;
varying float vSide;
varying float vTravel;
varying float vShare;
varying float vFacing;
void main() {
  float core = 1.0 - vSide * vSide;
  float phase = fract((vTravel - uClock) / uPeriod);
  float rise = smoothstep(1.0 - uDashShare, 1.0, phase);
  float dash = rise * rise * (1.0 - smoothstep(0.97, 1.0, phase));
  float ends = smoothstep(0.0, uFade.x, vShare) * (1.0 - smoothstep(uFade.y, 1.0, vShare));
  float line = uLineOpacity * core * core * core;
  float facing = smoothstep(uFacing.x, uFacing.y, vFacing);
  float alpha = ends * facing * clamp(line + dash * core, 0.0, 1.0);
  gl_FragColor = vec4(mix(uLine, uDash, dash), alpha);
  #include <colorspace_fragment>
}
`;

export function flowMaterial(): ShaderMaterial {
  const { dashPeriod, dashShare, lineOpacity, fade, facing, minWidth, widthPerMetre } = STREAMLINES;
  return new ShaderMaterial({
    uniforms: {
      uLine: { value: new Color(FLOW_LOOK.line) },
      uDash: { value: new Color(FLOW_LOOK.dash) },
      uClock: { value: 0 },
      uPeriod: { value: dashPeriod },
      uDashShare: { value: dashShare },
      uLineOpacity: { value: lineOpacity },
      uFade: { value: new Vector2(...fade) },
      uFacing: { value: new Vector2(...facing) },
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
