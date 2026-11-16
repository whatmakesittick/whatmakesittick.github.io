import { BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial, Vector3 } from 'three';
import type { Object3D } from 'three';
import { lerp, smoothstep } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { ScaleId } from '../../ids';
import { CROSSFADE, VEIL } from '../constants';
import { registeredMaterial } from './context';
import type { PartContext } from './context';
import { RENDER_ORDER } from './beaker/glassware';

const VEIL_VERTEX = /* glsl */ `
uniform vec3 uFocus;
uniform float uProgress;
uniform float uDirection;
varying vec2 vScreen;
void main() {
  vec4 focus = projectionMatrix * viewMatrix * vec4(uFocus, 1.0);
  float travel = uDirection > 0.0 ? uProgress : 1.0 - uProgress;
  vec2 centre = clamp(focus.xy / focus.w, -1.0, 1.0) * (1.0 - smoothstep(0.0, 0.5, travel));
  vScreen = position.xy - centre;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const VEIL_FRAGMENT = /* glsl */ `
uniform float uAmount;
uniform float uProgress;
uniform float uDirection;
uniform vec3 uColour;
uniform vec3 uDeep;
varying vec2 vScreen;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}
void main() {
  float radius = length(vScreen);
  float angle = atan(vScreen.y, vScreen.x);
  float travel = uDirection > 0.0 ? uProgress : 1.0 - uProgress;
  float lane = floor(angle * 9.0);
  float streaks = pow(max(0.0, sin(angle * 57.0 + hash(vec2(lane, 2.0)) * 6.2832)), 24.0);
  streaks *= smoothstep(0.25, 1.3, radius) * (0.5 + 0.5 * sin(radius * 7.0 - travel * 30.0));
  float specks = 0.0;
  for (int layer = 0; layer < 3; layer++) {
    float depth = fract(travel * 1.4 + float(layer) / 3.0);
    vec2 q = vScreen * mix(7.0, 0.9, depth) + float(layer) * 17.0;
    vec2 cell = floor(q);
    vec2 offset = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
    float seed = hash(cell);
    float size = 0.03 + 0.05 * seed;
    float d = length(fract(q) - 0.5 - offset * 0.7);
    specks += smoothstep(size, size * 0.3, d) * step(0.6, seed) * sin(3.14159 * depth);
  }
  vec3 colour = mix(uDeep, uColour, smoothstep(1.5, 0.0, radius));
  colour += vec3(0.7, 0.86, 1.0) * (streaks * 0.14 + specks * 0.5);
  gl_FragColor = vec4(colour, uAmount);
  #include <colorspace_fragment>
}
`;

const FULL_SCREEN = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
const XYZ = 3;

export interface DiveLook {
  readonly beakerScale: number;
  readonly moleculeScale: number;
  readonly shown: ScaleId;
  readonly veil: number;
}

export function diveLook(target: ScaleId, share: number): DiveLook {
  const toward = target === 'molecules';
  const outgoing = 1 - smoothstep(share, 0, CROSSFADE.swapAt);
  const incoming = smoothstep(share, CROSSFADE.swapAt, 1);
  const veil = CROSSFADE.veilPeak * Math.sin(Math.PI * Math.min(1, share));
  const zoomed = (amount: number) => lerp(1, CROSSFADE.beakerZoom, amount);
  const shrunk = (amount: number) => lerp(1, CROSSFADE.moleculeStart, amount);
  const swapped = share >= CROSSFADE.swapAt;
  if (toward) {
    return {
      beakerScale: zoomed(1 - outgoing),
      moleculeScale: shrunk(1 - incoming),
      shown: swapped ? 'molecules' : 'beaker',
      veil,
    };
  }
  return {
    beakerScale: zoomed(1 - incoming),
    moleculeScale: shrunk(1 - outgoing),
    shown: swapped ? 'beaker' : 'molecules',
    veil,
  };
}

export class DiveVeil {
  readonly mesh: Mesh;
  private readonly shader: ShaderMaterial;
  private readonly clear = new Color(VEIL.clear);
  private readonly deep = new Color(VEIL.deep);

  constructor(context: PartContext, parent: Object3D) {
    this.shader = registeredMaterial(
      context,
      UNDIMMED_GROUP,
      new ShaderMaterial({
        vertexShader: VEIL_VERTEX,
        fragmentShader: VEIL_FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uAmount: { value: 0 },
          uProgress: { value: 0 },
          uDirection: { value: 1 },
          uColour: { value: new Color(VEIL.clear) },
          uDeep: { value: new Color(VEIL.navy) },
          uFocus: { value: new Vector3(...CROSSFADE.focus) },
        },
      }),
    );
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(FULL_SCREEN, XYZ));
    this.mesh = new Mesh(context.tracker.track(geometry), this.shader);
    this.mesh.name = 'diveVeil';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = RENDER_ORDER.veil;
    this.mesh.visible = false;
    parent.add(this.mesh);
  }

  show(target: ScaleId, share: number, depth: number, amount: number): void {
    const uniforms = this.shader.uniforms;
    this.mesh.visible = amount > 0;
    uniforms.uAmount.value = amount;
    uniforms.uProgress.value = share;
    uniforms.uDirection.value = target === 'molecules' ? 1 : -1;
    (uniforms.uColour.value as Color).copy(this.clear).lerp(this.deep, Math.sqrt(depth));
  }
}
