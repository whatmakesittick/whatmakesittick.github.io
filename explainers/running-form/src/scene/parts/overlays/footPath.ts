import { BufferGeometry, CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { Mesh, MeshBasicMaterial } from 'three';
import type { AssemblyState } from '../../../ids';
import { ankleAgainstHip, footPathAt } from '../../../model/footPath';
import { THEME } from '../../../theme';
import type { RunnerPose } from '../../runnerPose';
import type { PartContext } from '../context';
import { FOOT_PATH_NAME } from './names';
import { FadedOverlay } from './fadedOverlay';
import { overlayMaterial, overlayMesh, unitDot } from './strokes';
import { OverlayTag } from './tag';

export const FOOT_PATH_PLANE_Z_M = 0.3;

const TUBE = { segments: 160, radius: 0.007, sides: 8 } as const;
const DOT_RADIUS_M = 0.022;
const TAG_LIFT_M = 0.06;

export class FootPath extends FadedOverlay {
  private readonly context: PartContext;
  private readonly material: MeshBasicMaterial;
  private readonly loop: Mesh;
  private readonly dot: Mesh;
  private readonly tag = new OverlayTag(THEME.footPath);
  private key = '';

  constructor(context: PartContext) {
    super('footPath');
    this.context = context;
    this.root.name = FOOT_PATH_NAME;
    this.material = overlayMaterial(context, THEME.footPath, false);
    this.loop = overlayMesh(context.tracker.track(new BufferGeometry()), this.material);
    this.dot = overlayMesh(unitDot(context), this.material);
    this.dot.scale.setScalar(DOT_RADIUS_M);
    this.root.add(this.loop, this.dot, this.tag.object);
  }

  tags(): readonly OverlayTag[] {
    return [this.tag];
  }

  dispose(): void {
    this.tag.dispose();
  }

  protected render(state: AssemblyState, pose: RunnerPose, share: number): void {
    this.rebuild(state);
    const hip = pose.legs.right.hip;
    this.root.position.set(hip.x, hip.y, FOOT_PATH_PLANE_Z_M);
    const ankle = ankleAgainstHip(state.reading.units, state.pace, state.stepRate);
    this.dot.position.set(ankle.x, ankle.y, 0);
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
