import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Vector3,
} from 'three';
import type { Blending } from 'three';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { RENDER_ORDER, TRAIL } from './constants';
import { patchShader } from './shader';
import type { Track } from './track';

export interface TrailStyle {
  readonly color: string;
  readonly width?: number;
  readonly glow?: number;
  readonly ghost?: number;
  readonly pulse?: number;
  readonly duty?: number;
  readonly blending?: Blending;
}

const CORNERS = 4;
const UP = new Vector3(0, 1, 0);
const EAST = new Vector3(1, 0, 0);
const PARALLEL = 0.99;

function corners(direction: Vector3): Vector3[] {
  const side = Math.abs(direction.dot(UP)) > PARALLEL ? EAST : UP;
  const first = new Vector3().crossVectors(direction, side).normalize();
  const second = new Vector3().crossVectors(direction, first).normalize();
  return [first, second, first.clone().negate(), second.clone().negate()];
}

function trailGeometry(track: Track): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const along: number[] = [];
  const flow: number[] = [];
  const indices: number[] = [];
  track.spans.forEach((span, index) => {
    const offsets = corners(span.direction);
    const ends = [
      { point: span.from, metres: span.start, units: span.flowStart },
      { point: span.to, metres: span.start + span.length, units: span.flowStart + span.flowLength },
    ];
    ends.forEach(({ point, metres, units }) =>
      offsets.forEach((offset) => {
        positions.push(point.x, point.y, point.z);
        normals.push(offset.x, offset.y, offset.z);
        along.push(metres);
        flow.push(units);
      }),
    );
    const base = index * CORNERS * 2;
    for (let corner = 0; corner < CORNERS; corner += 1) {
      const next = (corner + 1) % CORNERS;
      const [a, b, c, d] = [corner, next, corner + CORNERS, next + CORNERS].map((at) => base + at);
      indices.push(a, b, c, b, d, c);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('along', new BufferAttribute(new Float32Array(along), 1));
  geometry.setAttribute('flow', new BufferAttribute(new Float32Array(flow), 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

const VERTEX_HEAD = `
attribute float along;
attribute float flow;
uniform float uWidth;
varying float vAlong;
varying float vFlow;`;

const VERTEX_BEGIN = `
  float flowDepth = max(-(modelViewMatrix * vec4(position, 1.0)).z, 0.01);
  transformed += normal * uWidth * flowDepth / projectionMatrix[1][1];
  vAlong = along;
  vFlow = flow;`;

const FRAGMENT_HEAD = `
uniform float uReach;
uniform float uTime;
uniform float uGlow;
uniform float uPulse;
uniform float uDuty;
varying float vAlong;
varying float vFlow;`;

const FRAGMENT = `
  if (vAlong > uReach) discard;
  float flowPhase = fract(vFlow - uTime);
  float flowPulse = smoothstep(0.0, 0.06, flowPhase) * (1.0 - smoothstep(uDuty - 0.06, uDuty, flowPhase));
  diffuseColor.a *= uGlow + uPulse * flowPulse;`;

export class Trail {
  readonly object = new Group();
  private readonly uniforms: { value: number }[][] = [];
  private readonly glows: number[];

  constructor(context: PartContext, group: EmphasisGroup, track: Track, style: TrailStyle) {
    const geometry = context.tracker.track(trailGeometry(track));
    this.glows = [style.glow ?? TRAIL.glow, style.ghost ?? TRAIL.ghost];
    this.glows.forEach((glow, index) => {
      const ghost = index === 1;
      const uniforms = {
        uWidth: { value: style.width ?? TRAIL.width },
        uReach: { value: track.length },
        uTime: { value: 0 },
        uGlow: { value: glow },
        uPulse: { value: ghost ? 0 : (style.pulse ?? 0) },
        uDuty: { value: style.duty ?? TRAIL.duty },
      };
      const material = new MeshBasicMaterial({
        color: style.color,
        transparent: true,
        depthWrite: false,
        depthTest: !ghost,
        side: DoubleSide,
        blending: style.blending ?? NormalBlending,
        toneMapped: false,
      });
      patchShader(material, {
        key: 'flow-trail',
        uniforms,
        vertexHead: VERTEX_HEAD,
        vertexBegin: VERTEX_BEGIN,
        fragmentHead: FRAGMENT_HEAD,
        fragment: FRAGMENT,
      });
      const mesh = new Mesh(geometry, registeredMaterial(context, group, material));
      mesh.renderOrder = ghost ? RENDER_ORDER.ghost : RENDER_ORDER.trail;
      mesh.frustumCulled = false;
      this.object.add(mesh);
      this.uniforms.push([uniforms.uReach, uniforms.uTime, uniforms.uGlow]);
    });
  }

  set(reach: number, time: number, strength = 1): void {
    this.uniforms.forEach(([uReach, uTime, uGlow], index) => {
      uReach.value = reach;
      uTime.value = time;
      uGlow.value = this.glows[index] * strength;
    });
  }
}
