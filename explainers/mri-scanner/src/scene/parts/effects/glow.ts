import {
  AdditiveBlending,
  Color,
  DoubleSide,
  NormalBlending,
  ShaderMaterial,
  Vector2,
} from 'three';
import { BORE, FLOOR_Y, ISOCENTRE } from '../../../model/layout';
import { FIELD_LINES, FRINGE, RING_GLOW } from './looks';

const FLOW_VERTEX = /* glsl */ `
attribute float aDashes;
uniform vec2 uAxis;
uniform float uBore;
varying float vAlong;
varying float vDashes;
varying float vInside;
varying float vHeight;
varying vec3 vNormalView;
varying vec3 vViewPosition;
void main() {
  vAlong = uv.x;
  vDashes = aDashes;
  vInside = 1.0 - smoothstep(uBore, uBore * 1.6, length(position.xy - uAxis));
  vHeight = position.y;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -view.xyz;
  vNormalView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * view;
}
`;

const FLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uOffset;
uniform float uDuty;
uniform float uBoost;
uniform float uFloor;
uniform float uFloorFade;
varying float vAlong;
varying float vDashes;
varying float vInside;
varying float vHeight;
varying vec3 vNormalView;
varying vec3 vViewPosition;
void main() {
  float ground = smoothstep(uFloor, uFloor + uFloorFade, vHeight);
  if (ground <= 0.0) discard;
  float facing = abs(dot(normalize(vNormalView), normalize(vViewPosition)));
  float phase = fract(vAlong * vDashes - uOffset);
  float dash = smoothstep(0.0, uDuty, phase) * (1.0 - smoothstep(uDuty, uDuty + 0.08, phase));
  float body = mix(0.3, 1.0, dash) * mix(0.6, 1.0, facing);
  float alpha = uOpacity * body * mix(1.0, uBoost, vInside) * ground;
  gl_FragColor = vec4(uColour * (1.0 + dash * 0.6), alpha);
  #include <colorspace_fragment>
}
`;

const RIBBON_VERTEX = /* glsl */ `
varying float vAlong;
void main() {
  vAlong = uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RIBBON_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uDashes;
uniform float uDuty;
varying float vAlong;
void main() {
  if (fract(vAlong * uDashes) > uDuty) discard;
  gl_FragColor = vec4(uColour, uOpacity);
  #include <colorspace_fragment>
}
`;

const RING_VERTEX = /* glsl */ `
varying float vAcross;
varying vec3 vNormalView;
varying vec3 vViewPosition;
void main() {
  vAcross = uv.y;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -view.xyz;
  vNormalView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * view;
}
`;

const RING_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uEdge;
uniform float uBrightness;
uniform float uCore;
varying float vAcross;
varying vec3 vNormalView;
varying vec3 vViewPosition;
void main() {
  float facing = abs(dot(normalize(vNormalView), normalize(vViewPosition)));
  float rim = mix(0.55, 1.0, pow(1.0 - facing, uEdge));
  float band = sin(3.14159265 * vAcross);
  float core = pow(band, uCore);
  gl_FragColor = vec4(uColour * uBrightness * (0.6 + core), min(uOpacity * rim * band, 1.0));
  #include <colorspace_fragment>
}
`;

const SLAB_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uSoft;
varying vec2 vFace;
void main() {
  float edge = 1.0 - smoothstep(1.0 - uSoft, 1.0, length(vFace * 2.0 - 1.0));
  gl_FragColor = vec4(uColour, uOpacity * edge);
  #include <colorspace_fragment>
}
`;

const SLAB_VERTEX = /* glsl */ `
varying vec2 vFace;
void main() {
  vFace = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const EFFECT_PARAMETERS = {
  transparent: true,
  depthWrite: false,
  blending: NormalBlending,
  side: DoubleSide,
  toneMapped: false,
} as const;

export function flowMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColour: { value: new Color(FIELD_LINES.colour) },
      uOpacity: { value: FIELD_LINES.opacity },
      uOffset: { value: 0 },
      uDuty: { value: FIELD_LINES.dashDuty },
      uBoost: { value: FIELD_LINES.insideBoost },
      uAxis: { value: new Vector2(ISOCENTRE[0], ISOCENTRE[1]) },
      uBore: { value: BORE.radius },
      uFloor: { value: FLOOR_Y },
      uFloorFade: { value: FIELD_LINES.floorFade },
    },
    vertexShader: FLOW_VERTEX,
    fragmentShader: FLOW_FRAGMENT,
    ...EFFECT_PARAMETERS,
  });
}

export function ribbonMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColour: { value: new Color(FRINGE.colour) },
      uOpacity: { value: FRINGE.opacity },
      uDashes: { value: FRINGE.dashes },
      uDuty: { value: FRINGE.dashDuty },
    },
    vertexShader: RIBBON_VERTEX,
    fragmentShader: RIBBON_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
}

export function ringMaterial(colour: string, edge: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColour: { value: new Color(colour) },
      uOpacity: { value: 0 },
      uEdge: { value: edge },
      uBrightness: { value: RING_GLOW.brightness },
      uCore: { value: RING_GLOW.core },
    },
    vertexShader: RING_VERTEX,
    fragmentShader: RING_FRAGMENT,
    ...EFFECT_PARAMETERS,
    blending: AdditiveBlending,
  });
}

export function slabMaterial(colour: string, soft: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColour: { value: new Color(colour) },
      uOpacity: { value: 0 },
      uSoft: { value: soft },
    },
    vertexShader: SLAB_VERTEX,
    fragmentShader: SLAB_FRAGMENT,
    ...EFFECT_PARAMETERS,
  });
}

export function advanceOffset(material: ShaderMaterial, distance: number): void {
  const offset = material.uniforms.uOffset.value + distance;
  material.uniforms.uOffset.value = offset - Math.floor(offset);
}
