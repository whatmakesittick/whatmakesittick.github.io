import { Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { ARROW_LOOK, FLOW_LOOK } from './constants';

export interface ArrowShape {
  readonly headLength: number;
  readonly shaftHalf: number;
  readonly headHalf: number;
  readonly chevronHalf: number;
  readonly chevronPeriod: number;
  readonly margin: number;
}

const VERTEX = /* glsl */ `
attribute vec2 aArrow;
attribute float aLength;
attribute float aRate;
varying vec2 vArrow;
varying float vLength;
varying float vRate;
#include <fog_pars_vertex>
void main() {
  vArrow = aArrow;
  vLength = aLength;
  vRate = aRate;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform vec3 uChevron;
uniform float uCycle;
uniform float uPeriod;
uniform float uHead;
uniform float uShaftHalf;
uniform float uHeadHalf;
uniform float uChevronHalf;
uniform float uEdge;
uniform float uHalo;
uniform float uBody;
uniform float uHaloOpacity;
uniform float uSlope;
uniform float uChevronShare;
uniform float uTailFade;
varying vec2 vArrow;
varying float vLength;
varying float vRate;
#include <fog_pars_fragment>
void main() {
  float along = vArrow.x;
  float across = abs(vArrow.y);
  float neck = vLength - uHead;
  float headShare = clamp((along - neck) / uHead, 0.0, 1.0);
  float halfWidth = along < neck ? uShaftHalf : uHeadHalf * (1.0 - headShare);
  float outside = max(across - halfWidth, max(-along, along - vLength));
  float edge = uEdge * uShaftHalf;
  float body = 1.0 - smoothstep(-edge, edge, outside);
  float halo = exp(-max(outside, 0.0) / (uHalo * uShaftHalf));
  float tail = smoothstep(0.0, uTailFade * vLength, along);
  float phase = fract((along + across * uSlope) / (uPeriod * vRate) - uCycle);
  float stripe = smoothstep(0.0, 0.1, phase) * (1.0 - smoothstep(uChevronShare, uChevronShare + 0.1, phase));
  float span = 1.0 - smoothstep(0.75 * uChevronHalf, uChevronHalf, across);
  float before = 1.0 - smoothstep(neck - 0.6 * uPeriod, neck, along);
  float chevron = stripe * span * before * tail;
  float glow = tail * max(body * uBody, (1.0 - body) * halo * uHaloOpacity);
  gl_FragColor = vec4(mix(uColour, uChevron, chevron), clamp(glow + chevron, 0.0, 1.0));
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export type ArrowMaterial = ShaderMaterial & { readonly color: Color };

export function arrowMaterial(shape: ArrowShape): ArrowMaterial {
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uChevron: { value: new Color(FLOW_LOOK.chevron) },
        uCycle: { value: 0 },
        uPeriod: { value: shape.chevronPeriod },
        uHead: { value: shape.headLength },
        uShaftHalf: { value: shape.shaftHalf },
        uHeadHalf: { value: shape.headHalf },
        uChevronHalf: { value: shape.chevronHalf },
        uEdge: { value: ARROW_LOOK.edge },
        uHalo: { value: ARROW_LOOK.halo },
        uBody: { value: ARROW_LOOK.bodyOpacity },
        uHaloOpacity: { value: ARROW_LOOK.haloOpacity },
        uSlope: { value: ARROW_LOOK.chevronSlope },
        uChevronShare: { value: ARROW_LOOK.chevronShare },
        uTailFade: { value: ARROW_LOOK.tailFade },
      },
    ]),
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    fog: true,
  });
  const color = new Color(FLOW_LOOK.line);
  material.uniforms.uColour = { value: color };
  return Object.assign(material, { color });
}

export function advanceArrows(material: ShaderMaterial, metres: number): void {
  const { uCycle, uPeriod } = material.uniforms;
  uCycle.value = ((uCycle.value as number) + metres / (uPeriod.value as number)) % 1;
}
