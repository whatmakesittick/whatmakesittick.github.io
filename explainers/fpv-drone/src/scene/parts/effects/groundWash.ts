import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from 'three';
import { clamp, smoothstep } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { FlightReading, MotorShares } from '../../../ids';
import { GROUND_WASH } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';

const VERTEX = /* glsl */ `
varying vec2 vPlane;
void main() {
  vPlane = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uStrength;
uniform float uCycle;
uniform float uRings;
uniform vec3 uEnvelope;
uniform vec2 uStreaks;
varying vec2 vPlane;

float hash(float n) {
  return fract(sin(n * 12.9898) * 43758.5453);
}

float bins(float angle, float count, float seed) {
  float x = (angle / 6.2831853 + 0.5) * count;
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash(mod(i, count) + seed), hash(mod(i + 1.0, count) + seed), u);
}

void main() {
  float r = length(vPlane);
  float angle = atan(vPlane.y, vPlane.x);
  float envelope = smoothstep(uEnvelope.x, uEnvelope.y, r) * (1.0 - smoothstep(uEnvelope.z, 1.0, r));
  float travel = r * uRings - uCycle;
  float wave = fract(travel);
  float ring = smoothstep(0.0, 0.7, wave) * (1.0 - smoothstep(0.75, 0.95, wave));
  float puffs = bins(angle, uStreaks.y, floor(travel) * 3.7);
  float streaks = bins(angle, uStreaks.x, 1.0);
  float dust = envelope * mix(0.2, 1.0, streaks * streaks) * (0.25 + ring * puffs * 1.4);
  gl_FragColor = vec4(uColour, min(dust * uStrength * uOpacity, 1.0));
  #include <colorspace_fragment>
}
`;

const QUARTER_TURN = Math.PI / 2;

export const GROUND_WASH_NAME = 'groundWash';

export type WashFlight = Pick<FlightReading, 'height' | 'position'>;

export function groundWashStrength(height: number, shares: MotorShares): number {
  const { reach, thrust } = GROUND_WASH;
  const mean = shares.reduce((sum, share) => sum + share, 0) / shares.length;
  const nearness = 1 - smoothstep(height, reach.full, reach.none);
  return nearness * clamp(mean / thrust.reference, 0, thrust.max);
}

export function groundWashRadius(height: number): number {
  return GROUND_WASH.radius * (1 + GROUND_WASH.spread * Math.max(height, 0));
}

function washMaterial(): ShaderMaterial {
  const { envelope, streaks } = GROUND_WASH;
  return new ShaderMaterial({
    uniforms: {
      uColour: { value: new Color(GROUND_WASH.colour) },
      uOpacity: { value: GROUND_WASH.opacity },
      uStrength: { value: 0 },
      uCycle: { value: 0 },
      uRings: { value: GROUND_WASH.rings.count },
      uEnvelope: { value: new Vector3(envelope.inner[0], envelope.inner[1], envelope.outer) },
      uStreaks: { value: new Vector2(streaks.fine, streaks.coarse) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

export class GroundWash {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  constructor(context: PartContext) {
    const plane = context.tracker.track(new PlaneGeometry(2, 2));
    plane.rotateX(-QUARTER_TURN);
    this.material = registered(context, STRUCTURE_GROUP, washMaterial());
    this.mesh = new Mesh(plane, this.material);
    this.mesh.name = GROUND_WASH_NAME;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  setState(flight: WashFlight, shares: MotorShares): void {
    const strength = groundWashStrength(flight.height, shares);
    this.material.uniforms.uStrength.value = strength;
    this.mesh.visible = strength > GROUND_WASH.shown;
    if (!this.mesh.visible) return;
    const [x, , z] = flight.position;
    this.mesh.position.set(x, GROUND_WASH.lift, z);
    this.mesh.scale.setScalar(groundWashRadius(flight.height));
  }

  advance(deltaSeconds: number): void {
    if (!this.mesh.visible) return;
    const { speed, wrap } = GROUND_WASH.rings;
    const cycle = this.material.uniforms.uCycle.value + deltaSeconds * speed;
    this.material.uniforms.uCycle.value = cycle % wrap;
  }
}
