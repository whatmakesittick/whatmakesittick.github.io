import { BufferGeometry, CatmullRomCurve3, Group, TubeGeometry, Vector3 } from 'three';
import type { Mesh, MeshBasicMaterial } from 'three';
import { smoothstep } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { ankleAgainstHip, footPathAt } from '../../../model/footPath';
import { THEME } from '../../../theme';
import type { RunnerPose } from '../../runnerPose';
import type { PartContext } from '../context';
import { FOOT_PATH_NAME } from './names';
import type { Overlay } from './overlays';
import { Fade, overlayMaterial, overlayMesh, unitDot } from './strokes';
import { OverlayTag } from './tag';

export const FOOT_PATH_PLANE_Z_M = 0.3;

const TUBE = { segments: 160, radius: 0.007, sides: 8 } as const;
const DOT_RADIUS_M = 0.022;
const TAG_LIFT_M = 0.06;
const FADE_SECONDS = 0.3;

export class FootPath implements Overlay {
  readonly root = new Group();
  private readonly context: PartContext;
  private readonly material: MeshBasicMaterial;
  private readonly loop: Mesh;
  private readonly dot: Mesh;
  private readonly tag = new OverlayTag(THEME.footPath);
  private readonly fade = new Fade(FADE_SECONDS);
  private key = '';
  private state: AssemblyState | null = null;
  private pose: RunnerPose | null = null;

  constructor(context: PartContext) {
    this.context = context;
    this.root.name = FOOT_PATH_NAME;
    this.material = overlayMaterial(context, THEME.footPath, false);
    this.loop = overlayMesh(context.tracker.track(new BufferGeometry()), this.material);
    this.dot = overlayMesh(unitDot(context), this.material);
    this.dot.scale.setScalar(DOT_RADIUS_M);
    this.root.add(this.loop, this.dot, this.tag.object);
    this.root.visible = false;
  }

  setState(state: AssemblyState, pose: RunnerPose): void {
    this.state = state;
    this.pose = pose;
    this.fade.aim(state.view.footPath);
    this.apply();
  }

  update(deltaSeconds: number): boolean {
    const moving = this.fade.step(deltaSeconds);
    if (moving) this.apply();
    return moving;
  }

  tags(): readonly OverlayTag[] {
    return [this.tag];
  }

  dispose(): void {
    this.tag.dispose();
  }

  private apply(): void {
    const { state, pose } = this;
    this.root.visible = this.fade.share > 0;
    if (!state || !pose || !this.root.visible) return;
    this.rebuild(state);
    const hip = pose.legs.right.hip;
    this.root.position.set(hip.x, hip.y, FOOT_PATH_PLANE_Z_M);
    const ankle = ankleAgainstHip(state.reading.units, state.pace, state.stepRate);
    this.dot.position.set(ankle.x, ankle.y, 0);
    const share = smoothstep(this.fade.share);
    this.material.opacity = share;
    this.tag.show('overlay.footPath');
    this.tag.setOpacity(share);
  }

  private rebuild(state: AssemblyState): void {
    const key = `${state.pace}|${state.stepRate}`;
    if (key === this.key) return;
    this.key = key;
    const points = footPathAt(state.pace, state.stepRate).map(
      (point) => new Vector3(point.x, point.y, 0),
    );
    points.pop();
    const curve = new CatmullRomCurve3(points, true);
    const geometry = new TubeGeometry(curve, TUBE.segments, TUBE.radius, TUBE.sides, true);
    this.loop.geometry.dispose();
    this.loop.geometry = this.context.tracker.track(geometry);
    const top = points.reduce((best, point) => (point.y > best.y ? point : best));
    this.tag.object.position.set(top.x, top.y + TAG_LIFT_M, 0);
  }
}
