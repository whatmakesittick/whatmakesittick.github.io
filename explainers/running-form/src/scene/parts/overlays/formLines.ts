import { Vector3 } from 'three';
import type { Mesh, MeshBasicMaterial } from 'three';
import { smoothstep } from '@core/math';
import type { AssemblyState, GaitReading, PartId } from '../../../ids';
import { THEME } from '../../../theme';
import type { RunnerPose } from '../../runnerPose';
import type { PartContext } from '../context';
import { FORM_LINES_NAME } from './names';
import { FadedOverlay } from './fadedOverlay';
import { ArcTube, overlayMaterial, overlayMesh, stretch, unitLine } from './strokes';
import { OverlayTag } from './tag';

const SHIN_WINDOW = { from: 900, to: 100, feather: 30 } as const;
export const PARTS_NAMED_BY_TAGS: ReadonlySet<PartId> = new Set<PartId>(['knee', 'elbow']);

const LINE_RADIUS_M = 0.007;
const GUIDE_RADIUS_M = 0.004;
const ARC_THICKNESS_M = 0.005;
const ARC_RADIUS_M = { lean: 0.3, knee: 0.13, elbow: 0.09 } as const;
const VERTICAL_SHARE = 1.05;
const THIGH_EXTENSION_M = 0.17;
const SHIN_TAG_SHARE = 0.4;
const GUIDE_OPACITY = 0.55;
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

interface FormLabels {
  readonly lean: number;
  readonly knee: number;
  readonly elbow: number;
}

export function formLabels(reading: GaitReading): FormLabels {
  return {
    lean: Math.round(reading.upper.leanDeg),
    knee: Math.round(reading.right.kneeFlexDeg),
    elbow: Math.round(reading.upper.elbowDeg.right),
  };
}

export class FormLines extends FadedOverlay {
  private readonly line: MeshBasicMaterial;
  private readonly guide: MeshBasicMaterial;
  private readonly bodyLine: Mesh;
  private readonly vertical: Mesh;
  private readonly shin: Mesh;
  private readonly thighGuide: Mesh;
  private readonly leanArc: ArcTube;
  private readonly kneeArc: ArcTube;
  private readonly elbowArc: ArcTube;
  private readonly tagSet = {
    lean: new OverlayTag(THEME.formLine),
    elbow: new OverlayTag(THEME.formLine),
    knee: new OverlayTag(THEME.formLine),
    shin: new OverlayTag(THEME.formLine, 'left'),
  };
  private named: ReadonlySet<PartId> = PARTS_NAMED_BY_TAGS;
  private readonly temp = { a: new Vector3(), b: new Vector3(), c: new Vector3() };

  constructor(context: PartContext) {
    super('formLines');
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
      ...Object.values(this.tagSet).map((tag) => tag.object),
    );
  }

  nameParts(parts: ReadonlySet<PartId>): void {
    this.named = parts;
    this.apply();
  }

  tags(): readonly OverlayTag[] {
    return Object.values(this.tagSet);
  }

  dispose(): void {
    Object.values(this.tagSet).forEach((tag) => tag.dispose());
  }

  protected render(state: AssemblyState, pose: RunnerPose, share: number): void {
    this.line.opacity = share;
    this.guide.opacity = share * GUIDE_OPACITY;
    this.placeLean(state, pose);
    this.placeShin(state, pose, share);
    this.placeKnee(state, pose);
    this.placeElbow(state, pose);
    Object.values(this.tagSet).forEach((tag) => tag.setOpacity(share));
  }

  private placeLean(state: AssemblyState, pose: RunnerPose): void {
    const { pelvis, chest } = pose;
    const { a, b } = this.temp;
    stretch(this.bodyLine, pelvis, chest, LINE_RADIUS_M);
    a.copy(pelvis).addScaledVector(UP, chest.distanceTo(pelvis) * VERTICAL_SHARE);
    stretch(this.vertical, pelvis, a, GUIDE_RADIUS_M);
    b.subVectors(chest, pelvis);
    this.leanArc.set(pelvis, UP, b, ARC_RADIUS_M.lean, ARC_THICKNESS_M);
    this.tagSet.lean.show('overlay.lean', { value: formLabels(state.reading).lean });
    this.tagSet.lean.object.position.copy(a);
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
      this.tagSet.shin.hide();
      return;
    }
    this.tagSet.shin.show('overlay.shin');
    this.tagSet.shin.object.position.copy(leg.knee).lerp(leg.ankle, SHIN_TAG_SHARE);
    this.tagSet.shin.setOpacity(share * visible);
  }

  private showNamed(tag: OverlayTag, part: PartId, key: string, value: number): void {
    if (this.named.has(part)) tag.show(key, { value });
    else tag.hide();
  }

  private placeKnee(state: AssemblyState, pose: RunnerPose): void {
    const leg = pose.legs.right;
    const { a, b, c } = this.temp;
    a.subVectors(leg.knee, leg.hip).normalize();
    c.copy(leg.knee).addScaledVector(a, THIGH_EXTENSION_M);
    stretch(this.thighGuide, leg.knee, c, GUIDE_RADIUS_M);
    b.subVectors(leg.ankle, leg.knee);
    this.kneeArc.set(leg.knee, a, b, ARC_RADIUS_M.knee, ARC_THICKNESS_M);
    this.showNamed(this.tagSet.knee, 'knee', 'overlay.kneeBend', formLabels(state.reading).knee);
    this.tagSet.knee.object.position.copy(this.kneeArc.midpoint(leg.knee, ARC_RADIUS_M.knee, c));
  }

  private placeElbow(state: AssemblyState, pose: RunnerPose): void {
    const arm = pose.arms.right;
    const { a, b, c } = this.temp;
    a.subVectors(arm.shoulder, arm.elbow);
    b.subVectors(arm.wrist, arm.elbow);
    this.elbowArc.set(arm.elbow, a, b, ARC_RADIUS_M.elbow, ARC_THICKNESS_M);
    this.showNamed(
      this.tagSet.elbow,
      'elbow',
      'overlay.elbowBend',
      formLabels(state.reading).elbow,
    );
    this.tagSet.elbow.object.position.copy(
      this.elbowArc.midpoint(arm.elbow, ARC_RADIUS_M.elbow, c),
    );
  }
}
