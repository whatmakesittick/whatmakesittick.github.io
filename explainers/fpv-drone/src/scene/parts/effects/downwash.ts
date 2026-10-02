import {
  Color,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { clamp } from '@core/math';
import { MOTOR_PART_IDS } from '../../../ids';
import type { FlightReading, MotorShares } from '../../../ids';
import { MOTOR_SPIN } from '../../../model/layout';
import { toMetresPerSecond } from '../../../model/scale';
import { DOWNWASH } from '../../constants';
import { spinSign } from '../../geometry/blade';
import { DRONE_EULER_ORDER } from '../../pose';
import { registered } from '../context';
import type { PartContext } from '../context';
import type { PropellerSet } from '../drone/propeller';

const VERTEX = /* glsl */ `
attribute vec4 aFlow;
uniform vec3 uBend;
uniform float uBendPower;
uniform float uLength;
uniform float uLengthFloor;
uniform float uRadius;
uniform vec2 uWaist;
uniform vec2 uFlare;
uniform float uSwirl;
varying vec2 vSurface;
varying vec4 vFlow;
varying float vFacing;
varying float vHeight;
void main() {
  float along = -position.y;
  float reach = uLength * mix(uLengthFloor, 1.0, min(aFlow.y, 1.0));
  float girth = 1.0 - uWaist.x * smoothstep(0.0, uWaist.y, along)
    + uFlare.x * smoothstep(uFlare.y, 1.0, along);
  float turn = uv.x * 6.2831853 + aFlow.z * uSwirl * along;
  vec3 local = vec3(sin(turn) * uRadius * girth, -along * reach, cos(turn) * uRadius * girth);
  local += uBend * reach * pow(along, uBendPower);
  vec4 view = modelViewMatrix * instanceMatrix * vec4(local, 1.0);
  vec3 normal = normalize(normalMatrix * vec3(sin(turn), 0.0, cos(turn)));
  vSurface = vec2(uv.x, along);
  vFlow = aFlow;
  vFacing = abs(dot(normal, normalize(-view.xyz)));
  vHeight = (modelMatrix * instanceMatrix * vec4(local, 1.0)).y;
  gl_Position = projectionMatrix * view;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uHaze;
uniform float uLanes;
uniform vec2 uLaneWidth;
uniform float uLaneSkip;
uniform float uDashes;
uniform vec2 uPace;
uniform vec2 uFade;
uniform float uSoftness;
uniform float uGroundFade;
varying vec2 vSurface;
varying vec4 vFlow;
varying float vFacing;
varying float vHeight;

float hash(float n) {
  return fract(sin(n * 12.9898) * 43758.5453);
}

void main() {
  float lane = vSurface.x * uLanes;
  float id = floor(lane) + floor(vFlow.w + 0.5) * uLanes;
  float pick = hash(id);
  float glow = mix(0.45, 1.0, hash(id + 5.3));
  float width = mix(uLaneWidth.x, uLaneWidth.y, hash(id + 3.1));
  float line = (1.0 - smoothstep(0.0, width, abs(fract(lane) - 0.5))) * step(uLaneSkip, pick);
  float pace = 1.0 + floor(hash(id + 7.7) * uPace.y) * uPace.x;
  float cycle = fract(vSurface.y * uDashes - vFlow.x * pace + pick);
  float dash = smoothstep(0.1, 0.7, cycle) * (1.0 - smoothstep(0.72, 0.8, cycle));
  float fade = smoothstep(0.0, uFade.x, vSurface.y) * (1.0 - smoothstep(uFade.y, 1.0, vSurface.y))
    * smoothstep(0.0, uGroundFade, vHeight);
  float body = pow(vFacing, uSoftness);
  float alpha = (line * dash * glow + uHaze) * body * fade * vFlow.y * uOpacity;
  gl_FragColor = vec4(uColour, alpha);
  #include <colorspace_fragment>
}
`;

export const DOWNWASH_NAME = 'downwash';

const FLOW_SIZE = 4;
const DISC_GAP = 0.002;

export type WakeFlight = Pick<
  FlightReading,
  'heading' | 'pitch' | 'roll' | 'speedKmh' | 'verticalSpeed'
>;

export function downwashLevels(shares: MotorShares): number[] {
  const { reference, gain, max } = DOWNWASH.level;
  const mean = shares.reduce((sum, share) => sum + share, 0) / shares.length;
  if (mean <= 0) return shares.map(() => 0);
  const power = mean / reference;
  return shares.map((share) => clamp(power * (1 + (gain * (share - mean)) / mean), 0, max));
}

const turn = new Euler();
const toBody = new Quaternion();

export function wakeBend(flight: WakeFlight, target: Vector3): Vector3 {
  const { max, fullAtKmh, rise } = DOWNWASH.bend;
  const speed = toMetresPerSecond(flight.speedKmh);
  target.set(
    -Math.cos(flight.heading) * speed,
    -flight.verticalSpeed,
    -Math.sin(flight.heading) * speed,
  );
  turn.set(flight.roll, -flight.heading, -flight.pitch, DRONE_EULER_ORDER);
  target.applyQuaternion(toBody.setFromEuler(turn).invert());
  target.multiplyScalar(max / toMetresPerSecond(fullAtKmh)).clampLength(0, max);
  target.y = Math.min(target.y, rise);
  return target;
}

export function flowRate(level: number): number {
  const { base, gain } = DOWNWASH.flow;
  return (base + gain * level) * DOWNWASH.dashes;
}

function tubeGeometry(): CylinderGeometry {
  const tube = new CylinderGeometry(1, 1, 1, DOWNWASH.around, DOWNWASH.along, true);
  tube.translate(0, -0.5, 0);
  return tube;
}

function downwashMaterial(): ShaderMaterial {
  const { radius, length, waist, flare, lanes, laneWidth, fade } = DOWNWASH;
  return new ShaderMaterial({
    uniforms: {
      uBend: { value: new Vector3() },
      uBendPower: { value: DOWNWASH.bend.power },
      uLength: { value: length },
      uLengthFloor: { value: DOWNWASH.lengthFloor },
      uRadius: { value: radius },
      uWaist: { value: new Vector2(waist.share, waist.by) },
      uFlare: { value: new Vector2(flare.share, flare.from) },
      uSwirl: { value: DOWNWASH.swirl },
      uColour: { value: new Color(DOWNWASH.colour) },
      uOpacity: { value: DOWNWASH.opacity },
      uHaze: { value: DOWNWASH.haze },
      uSoftness: { value: DOWNWASH.softness },
      uGroundFade: { value: DOWNWASH.groundFade },
      uLanes: { value: lanes },
      uLaneWidth: { value: new Vector2(...laneWidth) },
      uLaneSkip: { value: DOWNWASH.laneSkip },
      uDashes: { value: DOWNWASH.dashes },
      uPace: { value: new Vector2(DOWNWASH.pace.step, DOWNWASH.pace.count) },
      uFade: { value: new Vector2(fade.top, fade.from) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
}

export class DownwashPart {
  readonly mesh: InstancedMesh;
  private readonly material: ShaderMaterial;
  private readonly flow: InstancedBufferAttribute;
  private levels: number[] = MOTOR_PART_IDS.map(() => 0);

  constructor(context: PartContext, propellers: PropellerSet) {
    const geometry = context.tracker.track(tubeGeometry());
    this.flow = new InstancedBufferAttribute(
      new Float32Array(MOTOR_PART_IDS.length * FLOW_SIZE),
      FLOW_SIZE,
    );
    this.flow.setUsage(DynamicDrawUsage);
    geometry.setAttribute('aFlow', this.flow);
    this.material = registered(context, 'propellers', downwashMaterial());
    this.mesh = new InstancedMesh(geometry, this.material, MOTOR_PART_IDS.length);
    const place = new Matrix4();
    MOTOR_PART_IDS.forEach((id, index) => {
      const { x, y, z } = propellers.of(id).object.position;
      this.mesh.setMatrixAt(index, place.makeTranslation(x, y - DISC_GAP, z));
      this.flow.setX(index, 0);
      this.flow.setZ(index, spinSign(MOTOR_SPIN[id]));
      this.flow.setW(index, index);
    });
    this.mesh.name = DOWNWASH_NAME;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  setState(shares: MotorShares, flight: WakeFlight): void {
    this.levels = downwashLevels(shares);
    this.levels.forEach((level, index) => this.flow.setY(index, level));
    this.flow.needsUpdate = true;
    wakeBend(flight, this.material.uniforms.uBend.value);
    this.mesh.visible = Math.max(...this.levels) > DOWNWASH.level.shown;
  }

  advance(deltaSeconds: number): void {
    if (!this.mesh.visible) return;
    this.levels.forEach((level, index) => {
      const travelled = this.flow.getX(index) + deltaSeconds * flowRate(level);
      this.flow.setX(index, travelled % DOWNWASH.flow.wrap);
    });
    this.flow.needsUpdate = true;
  }
}
