import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { smoothstep } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { FlightReading } from '../../../ids';
import { toMetresPerSecond } from '../../../model/scale';
import { WIND_STREAKS } from '../../constants';
import { hash2 } from '../../geometry/noise';
import { registered } from '../context';
import type { PartContext } from '../context';

const VERTEX = /* glsl */ `
attribute vec2 aCorner;
uniform vec3 uBox;
uniform vec3 uFlow;
uniform float uAhead;
uniform float uLength;
uniform float uWidth;
uniform vec3 uEye;
uniform vec2 uRider;
uniform vec2 uNear;
uniform float uEdge;
varying float vFade;
varying vec2 vCorner;
void main() {
  vec3 centre = cameraPosition + uFlow * uAhead;
  vec3 offset = mod(position * uBox - centre, uBox) - 0.5 * uBox;
  vec3 middle = centre + offset;
  vec3 across = cross(uFlow, normalize(cameraPosition - middle));
  float span = length(across);
  vec3 side = span > 1e-4 ? across / span : vec3(0.0, 1.0, 0.0);
  vec3 world = middle + uFlow * aCorner.x * uLength + side * aCorner.y * uWidth;
  vec3 reach = abs(offset) / uBox;
  float inside = 1.0 - smoothstep(uEdge, 0.5, max(reach.x, max(reach.y, reach.z)));
  float near = smoothstep(uNear.x, uNear.y, length(middle - cameraPosition));
  float rider = 1.0 - smoothstep(uRider.x, uRider.y, length(cameraPosition - uEye));
  vFade = inside * near * rider;
  vCorner = aCorner;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uStrength;
varying float vFade;
varying vec2 vCorner;
void main() {
  float taper = 1.0 - 4.0 * vCorner.x * vCorner.x;
  float core = 1.0 - vCorner.y * vCorner.y;
  gl_FragColor = vec4(uColour, uOpacity * uStrength * vFade * taper * core);
  #include <colorspace_fragment>
}
`;

export const WIND_STREAKS_NAME = 'windStreaks';

const XYZ = 3;
const CORNERS = [
  [-0.5, -1],
  [0.5, -1],
  [-0.5, 1],
  [0.5, 1],
] as const;

export type WindFlight = Pick<FlightReading, 'heading' | 'speedKmh' | 'verticalSpeed' | 'armed'>;

export function windStrength(flight: Pick<WindFlight, 'speedKmh' | 'armed'>): number {
  const { from, to } = WIND_STREAKS.speedKmh;
  return flight.armed ? smoothstep(flight.speedKmh, from, to) : 0;
}

export function streakSeeds(count: number, seed: number): Float32Array {
  const seeds = new Float32Array(count * XYZ);
  for (let index = 0; index < seeds.length; index += 1) {
    seeds[index] = hash2(Math.floor(index / XYZ), index % XYZ, seed);
  }
  return seeds;
}

export function windFlow(flight: WindFlight, target: Vector3): Vector3 {
  const speed = toMetresPerSecond(flight.speedKmh);
  return target
    .set(Math.cos(flight.heading) * speed, flight.verticalSpeed, Math.sin(flight.heading) * speed)
    .normalize();
}

function streakGeometry(): BufferGeometry {
  const { count, seed } = WIND_STREAKS;
  const seeds = streakSeeds(count, seed);
  const vertexSeeds = new Float32Array(count * CORNERS.length * XYZ);
  const corners = new Float32Array(count * CORNERS.length * 2);
  const indices: number[] = [];
  for (let streak = 0; streak < count; streak += 1) {
    const first = streak * CORNERS.length;
    CORNERS.forEach((corner, offset) => {
      vertexSeeds.set(seeds.subarray(streak * XYZ, streak * XYZ + XYZ), (first + offset) * XYZ);
      corners.set(corner, (first + offset) * 2);
    });
    indices.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(vertexSeeds, XYZ));
  geometry.setAttribute('aCorner', new BufferAttribute(corners, 2));
  geometry.setIndex(indices);
  return geometry;
}

function streakMaterial(): ShaderMaterial {
  const { box, rider, near } = WIND_STREAKS;
  return new ShaderMaterial({
    uniforms: {
      uBox: { value: new Vector3(...box) },
      uFlow: { value: new Vector3(1, 0, 0) },
      uAhead: { value: WIND_STREAKS.ahead },
      uLength: { value: 0 },
      uWidth: { value: WIND_STREAKS.width },
      uEye: { value: new Vector3() },
      uRider: { value: new Vector2(rider.full, rider.none) },
      uNear: { value: new Vector2(...near) },
      uEdge: { value: WIND_STREAKS.edge },
      uColour: { value: new Color(WIND_STREAKS.colour) },
      uOpacity: { value: WIND_STREAKS.opacity },
      uStrength: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
}

export class WindStreaks {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  constructor(context: PartContext) {
    this.material = registered(context, STRUCTURE_GROUP, streakMaterial());
    this.mesh = new Mesh(context.tracker.track(streakGeometry()), this.material);
    this.mesh.name = WIND_STREAKS_NAME;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  setState(flight: WindFlight, eye: Vector3): void {
    const strength = windStrength(flight);
    const { uniforms } = this.material;
    uniforms.uStrength.value = strength;
    this.mesh.visible = strength > 0;
    if (!this.mesh.visible) return;
    windFlow(flight, uniforms.uFlow.value);
    const { seconds, max } = WIND_STREAKS.length;
    uniforms.uLength.value = Math.min(toMetresPerSecond(flight.speedKmh) * seconds, max);
    uniforms.uEye.value.copy(eye);
  }
}
