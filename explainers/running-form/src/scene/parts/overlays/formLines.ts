import { Group, Vector3 } from 'three';
import type { Mesh, MeshBasicMaterial } from 'three';
import { smoothstep, toDegrees } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { THEME } from '../../../theme';
import type { RunnerPose } from '../../runnerPose';
import type { PartContext } from '../context';
import { FORM_LINES_NAME } from './names';
import type { Overlay } from './overlays';
import { ArcTube, Fade, overlayMaterial, overlayMesh, stretch, unitLine } from './strokes';
import { OverlayTag } from './tag';

export const SHIN_WINDOW = { from: 900, to: 100, feather: 30 } as const;

const LINE_RADIUS_M = 0.007;
const GUIDE_RADIUS_M = 0.004;
const ARC_THICKNESS_M = 0.005;
const ARC_RADIUS_M = { lean: 0.42, knee: 0.13, elbow: 0.09 } as const;
const VERTICAL_SHARE = 0.85;
const THIGH_EXTENSION_M = 0.17;
const GUIDE_OPACITY = 0.55;
const FADE_SECONDS = 0.3;
const CYCLE = 1000;
const UP = new Vector3(0, 1, 0);

export function shinShare(units: number): number {
  const sinceStart = (units - SHIN_WINDOW.from + CYCLE) % CYCLE;
  const span = (SHIN_WINDOW.to - SHIN_WINDOW.from + CYCLE) % CYCLE;
  if (sinceStart > span) return 0;
  return (
    smoothstep(sinceStart / SHIN_WINDOW.feather) *
    smoothstep((span - sinceStart) / SHIN_WINDOW.feather)
  );
}

export function leanDegrees(pose: RunnerPose, ankle: Vector3): number {
  const dx = pose.headTop.x - ankle.x;
  const dy = pose.headTop.y - ankle.y;
  return toDegrees(Math.atan2(dx, dy));
}

export function includedDegrees(a: Vector3, joint: Vector3, b: Vector3): number {
  const first = a.clone().sub(joint);
  const second = b.clone().sub(joint);
  return toDegrees(first.angleTo(second));
}

export class FormLines implements Overlay {
  readonly root = new Group();
  private readonly line: MeshBasicMaterial;
  private readonly guide: MeshBasicMaterial;
  private readonly bodyLine: Mesh;
  private readonly vertical: Mesh;
  private readonly shin: Mesh;
  private readonly thighGuide: Mesh;
  private readonly leanArc: ArcTube;
  private readonly kneeArc: ArcTube;
  private readonly elbowArc: ArcTube;
  private readonly tags = {
    lean: new OverlayTag(THEME.formLine),
    shin: new OverlayTag(THEME.formLine),
    knee: new OverlayTag(THEME.formLine),
    elbow: new OverlayTag(THEME.formLine),
  };
  private readonly fade = new Fade(FADE_SECONDS);
  private state: AssemblyState | null = null;
  private pose: RunnerPose | null = null;
  private readonly temp = { a: new Vector3(), b: new Vector3(), c: new Vector3() };

  constructor(context: PartContext) {
    this.root.name = FORM_LINES_NAME;
    this.line = overlayMaterial(context, THEME.formLine, true);
    this.guide = overlayMaterial(context, THEME.formLine, true);
    const unit = unitLine(context);
    this.bodyLine = overlayMesh(unit, this.line);
    this.vertical = overlayMesh(unit, this.guide);
    this.shin = overlayMesh(unit, this.line);
    this.thighGuide = overlayMesh(unit, this.guide);
    this.leanArc = new ArcTube(context, this.line);
    this.kneeArc = new ArcTube(context, this.line);
    this.elbowArc = new ArcTube(context, this.line);
    this.root.add(
      this.bodyLine,
      this.vertical,
      this.shin,
      this.thighGuide,
      this.leanArc.mesh,
      this.kneeArc.mesh,
      this.elbowArc.mesh,
      ...Object.values(this.tags).map((tag) => tag.object),
    );
    this.root.visible = false;
  }

  setState(state: AssemblyState, pose: RunnerPose): void {
    this.state = state;
    this.pose = pose;
    this.fade.aim(state.view.formLines);
    this.apply();
  }

  update(deltaSeconds: number): boolean {
    const moving = this.fade.step(deltaSeconds);
    if (moving) this.apply();
    return moving;
  }

  dispose(): void {
    Object.values(this.tags).forEach((tag) => tag.dispose());
  }

  private apply(): void {
    const { state, pose } = this;
    this.root.visible = this.fade.share > 0;
    if (!state || !pose || !this.root.visible) return;
    const share = smoothstep(this.fade.share);
    this.line.opacity = share;
    this.guide.opacity = share * GUIDE_OPACITY;
    this.placeLean(state, pose);
    this.placeShin(state, pose, share);
    this.placeKnee(pose);
    this.placeElbow(pose);
    Object.values(this.tags).forEach((tag) => tag.setOpacity(share));
  }

  private placeLean(state: AssemblyState, pose: RunnerPose): void {
    const side = state.reading.force.onFoot ?? 'right';
    const ankle = pose.legs[side].ankle;
    const { a, b } = this.temp;
    stretch(this.bodyLine, ankle, pose.headTop, LINE_RADIUS_M);
    const height = pose.headTop.y - ankle.y;
    a.copy(ankle).addScaledVector(UP, height * VERTICAL_SHARE);
    stretch(this.vertical, ankle, a, GUIDE_RADIUS_M);
    b.subVectors(pose.headTop, ankle);
    this.leanArc.set(ankle, UP, b, ARC_RADIUS_M.lean, ARC_THICKNESS_M);
    this.tags.lean.show('overlay.lean', { value: Math.round(leanDegrees(pose, ankle)) });
    this.tags.lean.object.position.copy(a);
  }

  private placeShin(state: AssemblyState, pose: RunnerPose, share: number): void {
    const visible = shinShare(state.reading.units);
    const leg = pose.legs.right;
    const { a, b } = this.temp;
    b.subVectors(leg.ankle, leg.knee);
    const toRoad = b.y < -1e-3 ? leg.knee.y / -b.y : 1;
    a.copy(leg.knee).addScaledVector(b, toRoad);
    this.shin.visible = visible > 0;
    stretch(this.shin, leg.knee, a, LINE_RADIUS_M * visible);
    if (visible <= 0) {
      this.tags.shin.hide();
      return;
    }
    this.tags.shin.show('overlay.shin');
    this.tags.shin.object.position.copy(leg.ankle).lerp(a, 0.5);
    this.tags.shin.setOpacity(share * visible);
  }

  private placeKnee(pose: RunnerPose): void {
    const leg = pose.legs.right;
    const { a, b, c } = this.temp;
    a.subVectors(leg.knee, leg.hip).normalize();
    c.copy(leg.knee).addScaledVector(a, THIGH_EXTENSION_M);
    stretch(this.thighGuide, leg.knee, c, GUIDE_RADIUS_M);
    b.subVectors(leg.ankle, leg.knee);
    this.kneeArc.set(leg.knee, a, b, ARC_RADIUS_M.knee, ARC_THICKNESS_M);
    const bend = 180 - includedDegrees(leg.hip, leg.knee, leg.ankle);
    this.tags.knee.show('overlay.kneeBend', { value: Math.round(bend) });
    this.tags.knee.object.position.copy(this.kneeArc.midpoint(leg.knee, ARC_RADIUS_M.knee, c));
  }

  private placeElbow(pose: RunnerPose): void {
    const arm = pose.arms.right;
    const { a, b, c } = this.temp;
    a.subVectors(arm.shoulder, arm.elbow);
    b.subVectors(arm.wrist, arm.elbow);
    this.elbowArc.set(arm.elbow, a, b, ARC_RADIUS_M.elbow, ARC_THICKNESS_M);
    this.tags.elbow.show('overlay.elbowBend', {
      value: Math.round(includedDegrees(arm.shoulder, arm.elbow, arm.wrist)),
    });
    this.tags.elbow.object.position.copy(this.elbowArc.midpoint(arm.elbow, ARC_RADIUS_M.elbow, c));
  }
}
