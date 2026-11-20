import {
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { smoothstep, toRadians } from '@core/math';
import type { AssemblyState, PhaseId } from '../../ids';
import { phaseBounds, strokeAt } from '../../model';
import { bodyPose } from '../pose';
import { SIDE, createSkeleton, solveArm } from '../rig/skeleton';
import { PHASE_TONES, THEME } from '../../theme';
import { LAYER } from './pool/constants';
import { registered } from './context';
import type { PartContext } from './context';

export const HAND_PATH_NAME = 'handPath';

const SAMPLES = 72;
const SMOOTHING_PASSES = 3;
const TUBE_SEGMENTS = 160;
const TUBE_RADIUS = 0.012;
const RADIAL_SEGMENTS = 10;
const OPACITY = 0.9;
const FADE = { old: 0.35, fresh: 0.05 } as const;
const TAPER_MIN = 0.3;
const RGBA = 4;

const tones: Partial<Record<PhaseId, Color>> = {
  entryCatch: new Color(PHASE_TONES.entryCatch),
  pull: new Color(PHASE_TONES.pull),
  push: new Color(PHASE_TONES.push),
};
const FALLBACK_TONE = new Color(THEME.handPath);

interface Trail {
  readonly points: Vector3[];
  readonly colors: Color[];
}

function sampleTrail(state: AssemblyState): Trail {
  const { pace, kick, breathing, headUp } = state;
  const end = phaseBounds(pace).recovery[0];
  const rootY = bodyPose(headUp ? 1 : 0, 0).y;
  const pose = createSkeleton().arms.right;
  const points: Vector3[] = [];
  const colors: Color[] = [];
  for (let index = 0; index < SAMPLES; index++) {
    const reading = strokeAt((index / (SAMPLES - 1)) * end, { pace, kick, breathing, headUp });
    solveArm(pose, reading.right, SIDE.right, toRadians(reading.shoulderRollDeg), rootY);
    points.push(pose.hand.clone());
    colors.push(tones[reading.right.phase] ?? FALLBACK_TONE);
  }
  return { points, colors };
}

function smoothed(points: readonly Vector3[]): Vector3[] {
  let current = points.map((point) => point.clone());
  for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
    current = current.map((point, index) => {
      if (index === 0 || index === current.length - 1) return point;
      return new Vector3()
        .addVectors(current[index - 1], current[index + 1])
        .addScaledVector(point, 2)
        .multiplyScalar(0.25);
    });
  }
  return current;
}

function fadeAt(along: number): number {
  return smoothstep(along / FADE.old) * smoothstep((1 - along) / FADE.fresh);
}

function shape(geometry: TubeGeometry, curve: CatmullRomCurve3, colors: readonly Color[]): void {
  const ringSize = RADIAL_SEGMENTS + 1;
  const positions = geometry.getAttribute('position');
  const values = new Float32Array(positions.count * RGBA);
  const centre = new Vector3();
  const vertex = new Vector3();
  const blended = new Color();
  for (let ring = 0; ring <= TUBE_SEGMENTS; ring++) {
    const along = ring / TUBE_SEGMENTS;
    const sample = curve.getUtoTmapping(along, along * curve.getLength()) * (colors.length - 1);
    const from = Math.floor(sample);
    const to = Math.min(from + 1, colors.length - 1);
    blended.copy(colors[from]).lerp(colors[to], sample - from);
    const fade = fadeAt(along);
    const taper = TAPER_MIN + (1 - TAPER_MIN) * fade;
    curve.getPointAt(along, centre);
    for (let corner = 0; corner < ringSize; corner++) {
      const index = ring * ringSize + corner;
      vertex.fromBufferAttribute(positions, index).sub(centre).multiplyScalar(taper).add(centre);
      positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
      values.set([blended.r, blended.g, blended.b, fade], index * RGBA);
    }
  }
  geometry.setAttribute('color', new Float32BufferAttribute(values, RGBA));
}

export class HandPath {
  readonly root = new Group();
  private readonly mesh: Mesh;
  private readonly context: PartContext;
  private key = '';

  constructor(context: PartContext) {
    this.context = context;
    const material = registered(
      context,
      UNDIMMED_GROUP,
      new MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: OPACITY,
        depthWrite: false,
      }),
    );
    this.mesh = new Mesh(undefined, material);
    this.mesh.renderOrder = LAYER.effects;
    this.root.name = HAND_PATH_NAME;
    this.root.add(this.mesh);
    this.root.visible = false;
  }

  setState(state: AssemblyState): void {
    this.root.visible = state.view.handPath;
    if (!this.root.visible) return;
    const key = `${state.pace}|${state.breathing}|${state.headUp}`;
    if (key === this.key) return;
    this.key = key;
    this.rebuild(state);
  }

  private rebuild(state: AssemblyState): void {
    const { points, colors } = sampleTrail(state);
    const curve = new CatmullRomCurve3(smoothed(points));
    const geometry = new TubeGeometry(curve, TUBE_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS);
    shape(geometry, curve, colors);
    this.mesh.geometry.dispose();
    this.mesh.geometry = this.context.tracker.track(geometry);
  }
}
