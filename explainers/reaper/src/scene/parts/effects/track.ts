import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  ShaderMaterial,
} from 'three';
import { FULL_TURN } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { CRUISE_ALTITUDE, LOITER } from '../../../model/layout';
import { ROUTE, ROUTE_LENGTH, altitudeAt, distanceAt, isOnStation } from '../../../model/flight';
import { TRACK } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';

const VERTEX = /* glsl */ `
attribute float aDistance;
attribute float aSide;
varying float vDistance;
varying float vSide;
void main() {
  vDistance = aDistance;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RIBBON_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uHead;
uniform float uOpacity;
uniform float uFloor;
uniform float uFade;
uniform float uGap;
varying float vDistance;
varying float vSide;
void main() {
  float behind = uHead - vDistance;
  if (behind < 0.0) discard;
  float trail = (uFloor + (1.0 - uFloor) * exp(-behind / uFade)) * smoothstep(0.0, uGap, behind);
  float edge = 1.0 - vSide * vSide;
  gl_FragColor = vec4(uColour, uOpacity * trail * edge);
  #include <colorspace_fragment>
}
`;

const ORBIT_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uDashes;
uniform float uDuty;
varying float vDistance;
varying float vSide;
void main() {
  float dash = step(fract(vDistance * uDashes), uDuty);
  float edge = 1.0 - vSide * vSide;
  gl_FragColor = vec4(uColour, uOpacity * dash * edge);
  #include <colorspace_fragment>
}
`;

const XYZ = 3;

interface RibbonPoint {
  x: number;
  y: number;
  z: number;
  heading: number;
  distance: number;
}

function ribbon(points: readonly RibbonPoint[], width: number): BufferGeometry {
  const positions = new Float32Array(points.length * 2 * XYZ);
  const distances = new Float32Array(points.length * 2);
  const sides = new Float32Array(points.length * 2);
  points.forEach((point, index) => {
    const across = [-Math.sin(point.heading), Math.cos(point.heading)];
    for (const [offset, side] of [
      [0, -1],
      [1, 1],
    ] as const) {
      const vertex = index * 2 + offset;
      positions.set(
        [
          point.x + (across[0] * side * width) / 2,
          point.y,
          point.z + (across[1] * side * width) / 2,
        ],
        vertex * XYZ,
      );
      distances[vertex] = point.distance;
      sides[vertex] = side;
    }
  });
  const indices: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = index * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setAttribute('aDistance', new BufferAttribute(distances, 1));
  geometry.setAttribute('aSide', new BufferAttribute(sides, 1));
  geometry.setIndex(indices);
  return geometry;
}

export function routePoints(step: number): RibbonPoint[] {
  const count = Math.ceil(ROUTE_LENGTH / step);
  return Array.from({ length: count + 1 }, (_, index) => {
    const distance = Math.min(index * step, ROUTE_LENGTH);
    const pose = ROUTE.poseAt(distance / ROUTE_LENGTH);
    return {
      x: pose.x,
      y: altitudeAt(distance) + TRACK.lift,
      z: pose.z,
      heading: pose.heading,
      distance,
    };
  });
}

function orbitPoints(): RibbonPoint[] {
  const { segments } = TRACK.orbit;
  return Array.from({ length: segments + 1 }, (_, index) => {
    const share = index / segments;
    const angle = share * FULL_TURN;
    return {
      x: LOITER.centre[0] + LOITER.radius * Math.cos(angle),
      y: CRUISE_ALTITUDE + TRACK.lift,
      z: LOITER.centre[1] + LOITER.radius * Math.sin(angle),
      heading: angle + Math.PI / 2,
      distance: share,
    };
  });
}

function trackMaterial(
  context: PartContext,
  fragmentShader: string,
  uniforms: Record<string, { value: unknown }>,
) {
  return registered(
    context,
    STRUCTURE_GROUP,
    new ShaderMaterial({
      uniforms: { uColour: { value: new Color(TRACK.colour) }, ...uniforms },
      vertexShader: VERTEX,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    }),
  );
}

export class TrackEffect {
  readonly object = new Group();
  private readonly flown: ShaderMaterial;
  private readonly orbit: Mesh;

  constructor(context: PartContext) {
    this.flown = trackMaterial(context, RIBBON_FRAGMENT, {
      uHead: { value: 0 },
      uOpacity: { value: TRACK.opacity },
      uFloor: { value: TRACK.floor },
      uFade: { value: TRACK.fadeDistance },
      uGap: { value: TRACK.gap },
    });
    const orbitMaterial = trackMaterial(context, ORBIT_FRAGMENT, {
      uOpacity: { value: TRACK.orbit.opacity },
      uDashes: { value: TRACK.orbit.dashes },
      uDuty: { value: TRACK.orbit.duty },
    });
    const flown = new Mesh(
      context.tracker.track(ribbon(routePoints(TRACK.step), TRACK.width)),
      this.flown,
    );
    this.orbit = new Mesh(
      context.tracker.track(ribbon(orbitPoints(), TRACK.orbit.width)),
      orbitMaterial,
    );
    flown.frustumCulled = false;
    this.orbit.frustumCulled = false;
    this.object.add(flown, this.orbit);
  }

  setState(phase: number, shown: boolean): void {
    this.object.visible = shown;
    this.flown.uniforms.uHead.value = distanceAt(phase);
    this.orbit.visible = isOnStation(phase);
  }
}
