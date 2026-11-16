import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { MeshStandardMaterial, Object3D } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../../ids';
import { MIXING_BEAKER, MIXING_FLOOR_Y, POUR_BEAKER, POUR_S, mixtureLevelCm } from '../../../model';
import { DETAIL, POUR_LOOK } from '../../constants';
import { DynamicTube } from '../../geometry/tube';
import { label, material, namedGroup, registeredMaterial } from '../context';
import type { PartContext, Section } from '../context';
import { OPAQUE_FRAGMENT, patchMaterial } from '../patches';
import { seededRandom } from '../random';
import { RENDER_ORDER } from './glassware';
import { pourShareFlow } from './pourMotion';
import type { PourPose } from './pourMotion';

const STREAM_HEAD = /* glsl */ `
uniform float uFlowTime;
varying vec2 vFlowUv;
`;

const STREAM_FRAGMENT = /* glsl */ `
float streamFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
float streamEdge = pow(1.0 - streamFacing, 2.0);
float streamFlow = sin(vFlowUv.y * 46.0 - uFlowTime + sin(vFlowUv.x * 12.566) * 1.4);
float streamGlint = smoothstep(0.55, 1.0, streamFlow) * 0.35;
gl_FragColor.rgb += vec3(0.85, 0.95, 1.0) * (streamEdge * 0.55 + streamGlint);
gl_FragColor.a = clamp(gl_FragColor.a + streamEdge * 0.5 + streamGlint, 0.0, 1.0);
`;

const SPLASH_VERTEX = /* glsl */ `
varying vec2 vSpot;
void main() {
  vSpot = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SPLASH_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uStrength;
uniform float uReach;
uniform vec3 uColour;
varying vec2 vSpot;
void main() {
  float radius = length(vSpot) / uReach;
  float rings = 0.0;
  for (int ring = 0; ring < 3; ring++) {
    float phase = fract(uTime * 2.2 + float(ring) / 3.0);
    rings += smoothstep(0.06, 0.0, abs(radius - phase)) * (1.0 - phase);
  }
  float core = smoothstep(0.35, 0.0, radius);
  float alpha = uStrength * (rings * 0.55 + core * 0.45) * smoothstep(1.0, 0.7, radius);
  gl_FragColor = vec4(uColour, alpha);
  #include <colorspace_fragment>
}
`;

const PATH_RINGS = DETAIL.streamSegments;
const SPLASH_SEGMENTS = 1;
const BUBBLE_SIZE = 0.35;
const BUBBLE_SEED = 250;
const BUBBLE_DEPTH = 3.2;
const BUBBLE_SPREAD = 2.4;
const BUBBLE_ALPHA = 0.7;
const BUBBLE_LINGER_S = 0.9;
const LIP_DROP = 0.15;
const BELL_SHARE = 0.92;
const BELL_WIDEN = 1.6;
const HALF = 0.5;
const SURFACE_GAP = 0.05;
const SPLASH_LIFT = 0.01;
const IDLE_SPLASH_OFFSET = 1;
const LINGER_STRENGTH = 0.6;

interface Bubble {
  readonly angle: number;
  readonly radius: number;
  readonly speed: number;
  readonly offset: number;
}

function bubbles(count: number): Bubble[] {
  const random = seededRandom(BUBBLE_SEED);
  return Array.from({ length: count }, () => ({
    angle: random() * Math.PI * 2,
    radius: random() * BUBBLE_SPREAD,
    speed: lerp(0.6, 1.4, random()),
    offset: random(),
  }));
}

export function buildStream(context: PartContext, parent: Object3D, pose: () => PourPose): Section {
  const root = namedGroup('pourStream', parent);
  const tube = new DynamicTube(PATH_RINGS, DETAIL.tube);
  context.tracker.track(tube);
  const streamMaterial = material(context, 'pourStream', 'stream') as MeshStandardMaterial;
  const flowTime = { value: 0 };
  patchStream(streamMaterial, flowTime);
  const stream = new Mesh(tube.geometry, streamMaterial);
  stream.name = 'pourStream';
  stream.renderOrder = RENDER_ORDER.stream;
  root.add(stream);
  const streamLabel = label(context, 'pourStream', stream, [0, 0, 0]);

  const splashShader = registeredMaterial(
    context,
    'pourStream',
    new ShaderMaterial({
      vertexShader: SPLASH_VERTEX,
      fragmentShader: SPLASH_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uStrength: { value: 0 },
        uReach: { value: POUR_LOOK.splashRadius },
        uColour: { value: new Color('#e8f6ff') },
      },
    }),
  );
  const splashGeometry = new PlaneGeometry(
    POUR_LOOK.splashRadius * 2,
    POUR_LOOK.splashRadius * 2,
    SPLASH_SEGMENTS,
    SPLASH_SEGMENTS,
  );
  splashGeometry.rotateX(-Math.PI / 2);
  const splash = new Mesh(context.tracker.track(splashGeometry), splashShader);
  splash.name = 'pourSplash';
  splash.renderOrder = RENDER_ORDER.stream;
  root.add(splash);

  const bubbleMaterial = registeredMaterial(
    context,
    'pourStream',
    createPointMaterial(context.textures.dot, BUBBLE_SIZE, AdditiveBlending),
  );
  const field = bubbles(POUR_LOOK.bubbles);
  const cloud = context.tracker.track(
    new PointCloud(field.length, bubbleMaterial, RENDER_ORDER.stream),
  );
  cloud.points.name = 'pourBubbles';
  root.add(cloud.points);

  const path = Array.from({ length: PATH_RINGS + 1 }, () => new Vector3());
  const radii = new Array<number>(PATH_RINGS + 1).fill(0);

  const shapeStream = (lip: Vector3, surface: number, rate: number) => {
    const fall = Math.max(0, lip.y - surface);
    const gravity = POUR_LOOK.gravityCmS2;
    const fallTime = Math.sqrt((2 * fall) / gravity);
    const speed = POUR_LOOK.jetSpeedCmS;
    const start = Math.max(POUR_LOOK.minJetRadius, POUR_LOOK.jetRadius * Math.sqrt(rate));
    for (let ring = 0; ring <= PATH_RINGS; ring += 1) {
      const share = ring / PATH_RINGS;
      const time = fallTime * share;
      path[ring].set(lip.x - speed * time, lip.y - LIP_DROP - (gravity * time * time) / 2, lip.z);
      const velocity = Math.hypot(speed, gravity * time);
      const bell = 1 + BELL_WIDEN * smoothstep(share, BELL_SHARE, 1);
      radii[ring] = Math.max(POUR_LOOK.minJetRadius, start * Math.sqrt(speed / velocity)) * bell;
    }
    path[PATH_RINGS].y = surface;
    tube.update(path, radii);
    streamLabel.position.copy(path[Math.round(PATH_RINGS * HALF)]);
  };

  const lip = new Vector3();
  const landing = new Vector3();
  const tint = new Color('#d8f0ff');

  return {
    root,
    setState: ({ clock }: AssemblyState) => {
      const current = pose();
      const surface = MIXING_FLOOR_Y + mixtureLevelCm(pourShareFlow(clock.pour));
      const flowing = current.rate > 0;
      stream.visible = flowing;
      lip.set(...current.lip);
      if (flowing) shapeStream(lip, surface, current.rate);
      flowTime.value = clock.seconds * POUR_LOOK.streakSpeed;
      const impact = flowing
        ? landing.copy(path[PATH_RINGS])
        : landing.set(POUR_BEAKER.lip[0] - IDLE_SPLASH_OFFSET, surface, POUR_BEAKER.lip[2]);
      splash.position.set(impact.x, surface + SPLASH_LIFT, impact.z);
      const linger = 1 - smoothstep(clock.seconds, POUR_S, POUR_S + BUBBLE_LINGER_S);
      const strength = Math.max(current.rate, clock.pour >= 1 ? linger * LINGER_STRENGTH : 0);
      splashShader.uniforms.uStrength.value = strength;
      splashShader.uniforms.uTime.value = clock.seconds;
      splash.visible = strength > 0;
      cloud.points.visible = strength > 0;
      field.forEach((bubble, index) => {
        const cycle = (clock.seconds * bubble.speed + bubble.offset) % 1;
        const depth = BUBBLE_DEPTH * (1 - cycle) * (0.3 + 0.7 * bubble.offset);
        const swirl = bubble.angle + clock.seconds * bubble.speed * 2;
        const spread = bubble.radius * (0.4 + cycle);
        const x = clamp(
          impact.x + Math.cos(swirl) * spread,
          -MIXING_BEAKER.innerRadius,
          MIXING_BEAKER.innerRadius,
        );
        const z = impact.z + Math.sin(swirl) * spread;
        cloud.setPoint(index, x, surface - SURFACE_GAP - depth, z);
        cloud.setColor(
          index,
          tint.r,
          tint.g,
          tint.b,
          BUBBLE_ALPHA * strength * Math.sin(Math.PI * cycle),
        );
      });
      cloud.commit();
    },
  };
}

function patchStream(streamMaterial: MeshStandardMaterial, flowTime: { value: number }): void {
  patchMaterial(streamMaterial, {
    key: 'iodine-stream',
    uniforms: { uFlowTime: flowTime },
    vertexHead: 'varying vec2 vFlowUv;',
    vertex: [{ after: '#include <uv_vertex>', code: 'vFlowUv = uv;' }],
    fragmentHead: STREAM_HEAD,
    fragment: [{ after: OPAQUE_FRAGMENT, code: STREAM_FRAGMENT }],
  });
}
