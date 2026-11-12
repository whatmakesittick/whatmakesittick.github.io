import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import type { Object3D, Sprite } from 'three';
import { FULL_TURN, clamp, lerp } from '@core/math';
import type { AssemblyState, PhaseId, Point } from '../../../ids';
import {
  COLLECT_PATH,
  DROPLET_PATH,
  EXPOSE_PATH,
  MASK_PATH,
  pathLength,
  pointOnPath,
} from '../../../model/path';
import type { Path } from '../../../model/path';
import { PHASE_TONES } from '../../../theme';
import { MARKER_RADIUS_M } from '../../constants';
import { BEAM_GROUP } from '../../sceneOptions';
import { label, namedGroup, registeredMaterial, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import { glowSprite } from '../kit';
import { EXPOSE_START_UNITS, MARKER, SCAN_UNITS, TRAIL } from './dims';

const TRAIL_PATHS: Partial<Record<PhaseId, Path>> = {
  droplet: DROPLET_PATH,
  collect: COLLECT_PATH,
  mask: MASK_PATH,
  expose: EXPOSE_PATH,
};
const RINGS = TRAIL.samples;
const SIDES = TRAIL.sides;
const CHANNELS = 3;
const FALLBACK: Point = [1, 0, 0];
const BEAD_EMISSIVE = 2.4;

function pathShare(state: AssemblyState): number {
  const { phase, units, share } = state.flash;
  if (phase !== 'expose') return share;
  return clamp((units - EXPOSE_START_UNITS) / (SCAN_UNITS - EXPOSE_START_UNITS), 0, 1);
}

function haloSize(closeUp: number): number {
  return MARKER_RADIUS_M * lerp(MARKER.closeGlowScale, MARKER.glowScale, closeUp);
}

function trailIndices(): number[] {
  const indices: number[] = [];
  for (let ring = 0; ring < RINGS - 1; ring += 1) {
    for (let side = 0; side < SIDES; side += 1) {
      const next = (side + 1) % SIDES;
      const [a, b] = [ring * SIDES + side, ring * SIDES + next];
      const [c, d] = [a + SIDES, b + SIDES];
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

export class MarkerPart {
  readonly object: Object3D = namedGroup('marker');
  private readonly bead: MeshStandardMaterial;
  private readonly halo: Sprite;
  private readonly trail: Mesh;
  private readonly trailGeometry = new BufferGeometry();
  private readonly positions = new BufferAttribute(
    new Float32Array(RINGS * SIDES * CHANNELS),
    CHANNELS,
  );
  private readonly colors = new BufferAttribute(
    new Float32Array(RINGS * SIDES * CHANNELS),
    CHANNELS,
  );
  private readonly tone = new Color();
  private readonly trailRoot = namedGroup('trail');
  private phase: PhaseId | null = null;
  private closeUp = 1;

  constructor(context: PartContext) {
    this.bead = registeredMaterial(
      context,
      BEAM_GROUP,
      new MeshStandardMaterial({ emissiveIntensity: BEAD_EMISSIVE, roughness: 0.4 }),
    );
    const sphere = new SphereGeometry(MARKER_RADIUS_M, ...MARKER.segments);
    const bead = new Mesh(context.tracker.track(sphere), this.bead);
    this.halo = glowSprite(context, BEAM_GROUP, '#ffffff', MARKER_RADIUS_M * MARKER.glowScale);
    this.positions.setUsage(DynamicDrawUsage);
    this.colors.setUsage(DynamicDrawUsage);
    this.trailGeometry.setAttribute('position', this.positions);
    this.trailGeometry.setAttribute('color', this.colors);
    this.trailGeometry.setIndex(trailIndices());
    const material = registeredMaterial(
      context,
      BEAM_GROUP,
      new MeshBasicMaterial({
        vertexColors: true,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.trail = new Mesh(context.tracker.track(this.trailGeometry), material);
    this.trail.frustumCulled = false;
    this.trailRoot.add(this.trail);
    this.object.add(bead, this.halo);
    label(context, 'flash', this.object, [0, MARKER_RADIUS_M * MARKER.labelLift, 0]);
    sceneAnchor(context, 'flash', this.object, [0, 0, 0]);
  }

  get trailObject(): Object3D {
    return this.trailRoot;
  }

  setState(state: AssemblyState): void {
    this.object.position.set(...state.flash.position);
    this.recolor(state.flash.phase);
    this.drawTrail(state);
  }

  fit(closeUp: number, state: AssemblyState): void {
    this.closeUp = closeUp;
    this.object.scale.setScalar(closeUp);
    this.halo.scale.setScalar(haloSize(closeUp));
    this.drawTrail(state);
  }

  private recolor(phase: PhaseId): void {
    if (phase === this.phase) return;
    this.phase = phase;
    this.tone.set(PHASE_TONES[phase]);
    this.bead.color.copy(this.tone);
    this.bead.emissive.copy(this.tone);
    this.halo.material.color.copy(this.tone);
  }

  private drawTrail(state: AssemblyState): void {
    const path = TRAIL_PATHS[state.flash.phase];
    const total = path ? pathLength(path) : 0;
    const head = path ? pathShare(state) * total : 0;
    const shown = path !== undefined && head > 0 && state.flash.units < SCAN_UNITS;
    this.trailRoot.visible = shown && state.view.beam;
    if (!path || !shown) return;
    const points = Array.from({ length: RINGS }, (_, ring) => {
      const behind = TRAIL.lengthM * (1 - ring / (RINGS - 1));
      return pointOnPath(path, Math.max(0, head - behind) / total).position;
    });
    points.forEach((point, ring) => this.writeRing(points, ring, point));
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }

  private writeRing(points: readonly Point[], ring: number, point: Point): void {
    const [from, to] = [points[Math.max(0, ring - 1)], points[Math.min(RINGS - 1, ring + 1)]];
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const [ux, uy] = length > 0 ? [dx / length, dy / length] : [FALLBACK[0], FALLBACK[1]];
    const taper = ring / (RINGS - 1);
    const radius = MARKER_RADIUS_M * TRAIL.radiusShare * taper * this.closeUp;
    const level = taper ** 2;
    for (let side = 0; side < SIDES; side += 1) {
      const angle = (side / SIDES) * FULL_TURN;
      const [across, depth] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
      const vertex = ring * SIDES + side;
      this.positions.setXYZ(
        vertex,
        point[0] - uy * across,
        point[1] + ux * across,
        point[2] + depth,
      );
      this.colors.setXYZ(vertex, this.tone.r * level, this.tone.g * level, this.tone.b * level);
    }
  }
}
