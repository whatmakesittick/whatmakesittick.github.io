import type { Vector3 } from 'three';
import {
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  TubeGeometry,
} from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { toRadians } from '@core/math';
import type { AssemblyState, PhaseId } from '../../ids';
import { phaseBounds, strokeAt } from '../../model';
import { bodyPose } from '../pose';
import { SIDE, createSkeleton, solveArm } from '../rig/skeleton';
import { PHASE_TONES, THEME } from '../../theme';
import { registered } from './context';
import type { PartContext } from './context';

const SAMPLES = 64;
const TUBE_SEGMENTS = 192;
const TUBE_RADIUS = 0.008;
const RADIAL_SEGMENTS = 8;
const OPACITY = 0.85;
const COLOR_STRIDE = 3;

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

function paint(geometry: TubeGeometry, colors: readonly Color[]): void {
  const rings = TUBE_SEGMENTS + 1;
  const ringSize = RADIAL_SEGMENTS + 1;
  const values = new Float32Array(rings * ringSize * COLOR_STRIDE);
  const blended = new Color();
  for (let ring = 0; ring < rings; ring++) {
    const position = (ring / TUBE_SEGMENTS) * (colors.length - 1);
    const from = Math.floor(position);
    const to = Math.min(from + 1, colors.length - 1);
    blended.copy(colors[from]).lerp(colors[to], position - from);
    for (let vertex = 0; vertex < ringSize; vertex++) {
      blended.toArray(values, (ring * ringSize + vertex) * COLOR_STRIDE);
    }
  }
  geometry.setAttribute('color', new Float32BufferAttribute(values, COLOR_STRIDE));
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
    const geometry = new TubeGeometry(
      new CatmullRomCurve3(points),
      TUBE_SEGMENTS,
      TUBE_RADIUS,
      RADIAL_SEGMENTS,
    );
    paint(geometry, colors);
    this.mesh.geometry.dispose();
    this.mesh.geometry = this.context.tracker.track(geometry);
  }
}
